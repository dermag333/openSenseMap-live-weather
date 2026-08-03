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
