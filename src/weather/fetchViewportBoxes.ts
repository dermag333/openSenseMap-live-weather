import { fetchBoxes } from '../api/boxes'
import type { SenseBox } from '../api/types'
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

const MAX_RADIUS_KM = 220

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
  } = {},
): Promise<ViewportBoxesResult> {
  const radiusKm = Math.min(MAX_RADIUS_KM, Math.max(2, viewport.radiusKm))
  const freshnessHours = options.freshnessHours ?? 12
  const hydrateLimit =
    options.hydrateLimit ?? Math.min(48, Math.max(20, Math.round(radiusKm / 4)))

  const data = await fetchBoxes({
    near: `${viewport.center.lon},${viewport.center.lat}`,
    maxDistance: Math.round(radiusKm * 1000),
  })

  const fresh = filterFreshBoxes(data, freshnessHours, false)
  const preferred = options.preferPhenomenon
    ? fresh.filter((box) =>
        (box.sensors ?? []).some(
          (sensor) => classifySensor(sensor)?.key === options.preferPhenomenon,
        ),
      )
    : fresh
  const pool = preferred.length >= 8 ? preferred : fresh

  const minSeparationKm = Math.max(3, radiusKm / 10)
  const targets = pickSpreadBoxes(pool, hydrateLimit, minSeparationKm)
  const hydrated = await hydrateBoxes(targets, targets.length, 3)

  // Keep only successfully hydrated boxes so empty shells don't hide gaps.
  const valued = hydrated.filter((box) => hasPopulatedMeasurements(box))

  return {
    boxes: valued,
    freshIds: valued.map((box) => box._id),
    radiusKm,
  }
}
