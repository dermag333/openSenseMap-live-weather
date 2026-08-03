export type HeatPoint = {
  lon: number
  lat: number
  value: number
}

const DEFAULT_POWER = 2
const MIN_DIST_DEG = 0.00015

/** Inverse-distance weighting at a map coordinate. */
export function idwAt(
  points: HeatPoint[],
  lon: number,
  lat: number,
  power = DEFAULT_POWER,
): number {
  let num = 0
  let den = 0

  for (const point of points) {
    const dLon = point.lon - lon
    const dLat = point.lat - lat
    const dist = Math.sqrt(dLon * dLon + dLat * dLat)
    if (dist < MIN_DIST_DEG) return point.value
    const w = 1 / dist ** power
    num += w * point.value
    den += w
  }

  return den === 0 ? Number.NaN : num / den
}

export function extractHeatPoints(
  features: Array<{
    geometry: { type: string; coordinates: number[] }
    properties?: { hasValue?: number; value?: number } | null
  }>,
): HeatPoint[] {
  return features.flatMap((feature) => {
    if (feature.geometry.type !== 'Point') return []
    const props = feature.properties
    if (!props || props.hasValue !== 1 || typeof props.value !== 'number') return []
    const [lon, lat] = feature.geometry.coordinates
    return [{ lon, lat, value: props.value }]
  })
}
