import { fetchBoxes } from '../api/boxes'
import type { SenseBox } from '../api/types'
import { debug } from '../debug/logger'
import { classifySensor } from './phenomena'
import { filterFreshBoxes } from './freshness'
import { hasPopulatedMeasurements, hydrateBoxes } from './hydrate'
import { pickSpreadBoxes } from './pickSpreadBoxes'
import type { LonLat, PhenomenonKey } from './types'

export type ViewportRequest = {
  center: LonLat
  radiusKm: number
}

export type ViewportBoxesResult = {
  boxes: SenseBox[]
  freshIds: string[]
  radiusKm: number
}

/** Dense regions (Berlin) time out beyond ~40 km; keep fetches reliable. */
const MAX_RADIUS_KM = 40

/**
 * Load stations covering the visible map (near + distance).
 * Wide zooms hydrate geographically spread boxes that actually have sensors.
 */
export async function fetchViewportBoxes(
  viewport: ViewportRequest,
  options: {
    freshnessHours?: number
    hydrateLimit?: number
    preferPhenomenon?: PhenomenonKey
    signal?: AbortSignal
  } = {},
): Promise<ViewportBoxesResult> {
  const radiusKm = Math.min(MAX_RADIUS_KM, Math.max(2, viewport.radiusKm))
  const freshnessHours = options.freshnessHours ?? 12
  const hydrateLimit =
    options.hydrateLimit ?? Math.min(36, Math.max(16, Math.round(radiusKm / 2)))

  debug.info('viewport', 'fetch start', {
    center: viewport.center,
    radiusKm,
    requestedRadiusKm: viewport.radiusKm,
    preferPhenomenon: options.preferPhenomenon ?? null,
    hydrateLimit,
  })

  const data = await fetchBoxes(
    {
      near: `${viewport.center.lon},${viewport.center.lat}`,
      maxDistance: Math.round(radiusKm * 1000),
      exposure: 'outdoor',
    },
    options.signal,
  )

  const fresh = filterFreshBoxes(data, freshnessHours, false)
  const preferred = options.preferPhenomenon
    ? fresh.filter((box) =>
        (box.sensors ?? []).some(
          (sensor) => classifySensor(sensor)?.key === options.preferPhenomenon,
        ),
      )
    : fresh
  const pool = preferred.length >= 8 ? preferred : fresh

  const minSeparationKm = Math.max(2, radiusKm / 10)
  const targets = pickSpreadBoxes(pool, hydrateLimit, minSeparationKm)
  debug.info('viewport', 'hydrate targets', {
    listed: data.length,
    fresh: fresh.length,
    preferred: preferred.length,
    targets: targets.length,
    minSeparationKm: Number(minSeparationKm.toFixed(1)),
  })

  const hydrated = await hydrateBoxes(targets, targets.length, 3, options.signal)
  const valued = hydrated.filter((box) => hasPopulatedMeasurements(box))

  const coords = valued.flatMap((box) => {
    const c = box.currentLocation?.coordinates
    return c ? [[c[0], c[1]] as [number, number]] : []
  })
  const lons = coords.map((c) => c[0])

  debug.info('viewport', 'fetch done', {
    valued: valued.length,
    lonSpan: lons.length ? Number((Math.max(...lons) - Math.min(...lons)).toFixed(3)) : 0,
    radiusKm,
  })

  return {
    boxes: valued,
    freshIds: valued.map((box) => box._id),
    radiusKm,
  }
}
