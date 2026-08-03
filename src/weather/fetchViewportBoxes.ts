import { fetchBoxes } from '../api/boxes'
import type { SenseBox } from '../api/types'
import { filterFreshBoxes } from './freshness'
import { hydrateBoxes } from './hydrate'
import { pickSpreadBoxes } from './pickSpreadBoxes'
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

const MAX_RADIUS_KM = 220

/**
 * Load stations covering the visible map (near + distance).
 * Wide zooms use a large radius and spread hydration so data fills the view.
 */
export async function fetchViewportBoxes(
  viewport: ViewportRequest,
  options: {
    freshnessHours?: number
    hydrateLimit?: number
  } = {},
): Promise<ViewportBoxesResult> {
  const radiusKm = Math.min(MAX_RADIUS_KM, Math.max(2, viewport.radiusKm))
  const freshnessHours = options.freshnessHours ?? 12
  const hydrateLimit =
    options.hydrateLimit ?? Math.min(70, Math.max(28, Math.round(radiusKm / 2.5)))

  const data = await fetchBoxes({
    near: `${viewport.center.lon},${viewport.center.lat}`,
    maxDistance: Math.round(radiusKm * 1000),
  })

  const fresh = filterFreshBoxes(data, freshnessHours, false)
  const minSeparationKm = Math.max(1.2, radiusKm / 14)
  const targets = pickSpreadBoxes(fresh, hydrateLimit, minSeparationKm)
  const hydrated = await hydrateBoxes(targets, targets.length)
  const byId = new Map(hydrated.map((box) => [box._id, box]))

  // Prefer hydrated (valued) boxes for the map; keep a light trail of others.
  const valued = hydrated
  const extras = data
    .filter((box) => !byId.has(box._id))
    .slice(0, Math.min(40, Math.round(radiusKm / 4)))
  const boxes = [...valued, ...extras]

  return {
    boxes,
    freshIds: fresh.map((box) => box._id),
    radiusKm,
  }
}
