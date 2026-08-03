import type { BBox, LonLat } from './types'

const EARTH_RADIUS_KM = 6371

export function bboxFromCenter(center: LonLat, radiusKm: number): BBox {
  const latDelta = (radiusKm / EARTH_RADIUS_KM) * (180 / Math.PI)
  const lonDelta =
    (radiusKm / (EARTH_RADIUS_KM * Math.cos((center.lat * Math.PI) / 180))) *
    (180 / Math.PI)

  return {
    west: clamp(center.lon - lonDelta, -180, 180),
    south: clamp(center.lat - latDelta, -90, 90),
    east: clamp(center.lon + lonDelta, -180, 180),
    north: clamp(center.lat + latDelta, -90, 90),
  }
}

export function bboxToQuery(bbox: BBox): string {
  return `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`
}

/** Stable key for comparing map views (rounded). */
export function bboxKey(bbox: BBox, digits = 3): string {
  const r = (n: number) => n.toFixed(digits)
  return `${r(bbox.west)},${r(bbox.south)},${r(bbox.east)},${r(bbox.north)}`
}

export function expandBBox(bbox: BBox, factor: number): BBox {
  const lonPad = ((bbox.east - bbox.west) * (factor - 1)) / 2
  const latPad = ((bbox.north - bbox.south) * (factor - 1)) / 2
  return {
    west: clamp(bbox.west - lonPad, -180, 180),
    south: clamp(bbox.south - latPad, -90, 90),
    east: clamp(bbox.east + lonPad, -180, 180),
    north: clamp(bbox.north + latPad, -90, 90),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function haversineKm(a: LonLat, b: LonLat): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function radiusKmForViewport(center: LonLat, northEast: LonLat): number {
  const raw = haversineKm(center, northEast) * 1.08
  return Math.min(250, Math.max(2, raw))
}
