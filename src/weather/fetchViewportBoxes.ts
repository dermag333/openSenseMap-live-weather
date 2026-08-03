import { fetchBoxes } from '../api/boxes'
import type { SenseBox } from '../api/types'
import { filterFreshBoxes } from './freshness'
import { hydrateBoxes } from './hydrate'
import type { LonLat } from './types'

export type ViewportRequest = {
  center: LonLat
  radiusKm: number
}

export type ViewportBoxesResult = {
  boxes: SenseBox[]
  freshIds: string[]
  radiusKm: number
}

/**
 * Load stations for the current map view via fast `near` + distance
 * (bbox list queries are too slow for interactive panning).
 */
export async function fetchViewportBoxes(
  viewport: ViewportRequest,
  options: {
    freshnessHours?: number
    hydrateLimit?: number
  } = {},
): Promise<ViewportBoxesResult> {
  const radiusKm = Math.min(40, Math.max(2, viewport.radiusKm))
  const freshnessHours = options.freshnessHours ?? 12
  const hydrateLimit = options.hydrateLimit ?? 40

  const data = await fetchBoxes({
    near: `${viewport.center.lon},${viewport.center.lat}`,
    maxDistance: Math.round(radiusKm * 1000),
  })

  // Map should show every fresh station in view — no outdoor-only cull.
  const fresh = filterFreshBoxes(data, freshnessHours, false)
  const ranked = [...fresh].sort((a, b) => {
    const aTime = a.lastMeasurementAt ? Date.parse(a.lastMeasurementAt) : 0
    const bTime = b.lastMeasurementAt ? Date.parse(b.lastMeasurementAt) : 0
    return bTime - aTime
  })

  const hydrated = await hydrateBoxes(ranked, hydrateLimit)
  const byId = new Map(hydrated.map((box) => [box._id, box]))
  const boxes = data.map((box) => byId.get(box._id) ?? box)

  return {
    boxes,
    freshIds: fresh.map((box) => box._id),
    radiusKm,
  }
}
