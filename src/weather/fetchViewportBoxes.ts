import { fetchBoxes } from '../api/boxes'
import type { SenseBox } from '../api/types'
import { debug } from '../debug/logger'
import { bboxToQuery } from './bbox'
import { classifySensor } from './phenomena'
import { filterFreshBoxes } from './freshness'
import { hasPopulatedMeasurements, hydrateBoxes } from './hydrate'
import { pickSpreadBoxes } from './pickSpreadBoxes'
import type { BBox, LonLat, PhenomenonKey } from './types'

export type ViewportRequest = {
  center: LonLat
  bbox: BBox
  radiusKm: number
}

export type ViewportBoxesResult = {
  boxes: SenseBox[]
  freshIds: string[]
  radiusKm: number
  bbox: BBox
}

/**
 * Like opensensemap.org: load stations for the visible bbox (fast),
 * then hydrate a geographically spread subset for measurement values.
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
  const freshnessHours = options.freshnessHours ?? 12
  const areaKm2 = approxAreaKm2(viewport.bbox)
  const hydrateLimit =
    options.hydrateLimit ??
    Math.min(56, Math.max(20, Math.round(Math.sqrt(areaKm2) / 2.5)))

  const bboxQuery = bboxToQuery(viewport.bbox)
  debug.info('viewport', 'fetch start (bbox)', {
    bbox: bboxQuery,
    radiusKm: viewport.radiusKm,
    preferPhenomenon: options.preferPhenomenon ?? null,
    hydrateLimit,
  })

  const data = await fetchBoxes(
    {
      bbox: bboxQuery,
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

  const minSeparationKm = Math.max(1.5, viewport.radiusKm / 12)
  const targets = pickSpreadBoxes(pool, hydrateLimit, minSeparationKm)
  debug.info('viewport', 'hydrate targets', {
    listed: data.length,
    fresh: fresh.length,
    preferred: preferred.length,
    targets: targets.length,
    minSeparationKm: Number(minSeparationKm.toFixed(1)),
  })

  const hydrated = await hydrateBoxes(targets, targets.length, 4, options.signal)
  const byId = new Map(hydrated.map((box) => [box._id, box]))

  // Keep all fresh stations in view (markers), prefer hydrated copies for values.
  const boxes = fresh.map((box) => byId.get(box._id) ?? box)
  const valued = boxes.filter((box) => hasPopulatedMeasurements(box))
  const coords = valued.flatMap((box) => {
    const c = box.currentLocation?.coordinates
    return c ? [[c[0], c[1]] as [number, number]] : []
  })
  const lons = coords.map((c) => c[0])

  debug.info('viewport', 'fetch done', {
    fresh: fresh.length,
    valued: valued.length,
    lonSpan: lons.length ? Number((Math.max(...lons) - Math.min(...lons)).toFixed(3)) : 0,
    radiusKm: viewport.radiusKm,
  })

  return {
    boxes,
    freshIds: fresh.map((box) => box._id),
    radiusKm: viewport.radiusKm,
    bbox: viewport.bbox,
  }
}

function approxAreaKm2(bbox: BBox): number {
  const midLat = (bbox.north + bbox.south) / 2
  const height = (bbox.north - bbox.south) * 111
  const width = (bbox.east - bbox.west) * 111 * Math.cos((midLat * Math.PI) / 180)
  return Math.max(1, Math.abs(width * height))
}
