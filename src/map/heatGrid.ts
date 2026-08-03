import type { Feature, FeatureCollection, Polygon } from 'geojson'
import type { PhenomenonKey } from '../weather/types'
import { PHENOMENON_SCALES } from './colorScales'

export type HeatPoint = {
  lon: number
  lat: number
  value: number
}

type HeatCellProps = {
  value: number
}

const POWER = 2
const MIN_DIST_DEG = 0.00015

export function buildHeatGrid(
  points: HeatPoint[],
  cols = 28,
  rows = 28,
): FeatureCollection<Polygon, HeatCellProps> {
  if (points.length === 0) {
    return { type: 'FeatureCollection', features: [] }
  }

  const lons = points.map((p) => p.lon)
  const lats = points.map((p) => p.lat)
  const padLon = Math.max((Math.max(...lons) - Math.min(...lons)) * 0.12, 0.02)
  const padLat = Math.max((Math.max(...lats) - Math.min(...lats)) * 0.12, 0.015)
  const west = Math.min(...lons) - padLon
  const east = Math.max(...lons) + padLon
  const south = Math.min(...lats) - padLat
  const north = Math.max(...lats) + padLat
  const cellW = (east - west) / cols
  const cellH = (north - south) / rows

  const features: Feature<Polygon, HeatCellProps>[] = []

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x0 = west + col * cellW
      const x1 = x0 + cellW
      const y0 = south + row * cellH
      const y1 = y0 + cellH
      const cx = (x0 + x1) / 2
      const cy = (y0 + y1) / 2
      const value = idw(points, cx, cy)
      if (!Number.isFinite(value)) continue

      features.push({
        type: 'Feature',
        properties: { value },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [x0, y0],
              [x1, y0],
              [x1, y1],
              [x0, y1],
              [x0, y0],
            ],
          ],
        },
      })
    }
  }

  return { type: 'FeatureCollection', features }
}

function idw(points: HeatPoint[], lon: number, lat: number): number {
  let num = 0
  let den = 0

  for (const point of points) {
    const dLon = point.lon - lon
    const dLat = point.lat - lat
    const dist = Math.sqrt(dLon * dLon + dLat * dLat)
    if (dist < MIN_DIST_DEG) return point.value
    const w = 1 / dist ** POWER
    num += w * point.value
    den += w
  }

  return den === 0 ? Number.NaN : num / den
}

export function heatFillColorExpression(phenomenon: PhenomenonKey): unknown[] {
  const scale = PHENOMENON_SCALES[phenomenon]
  return [
    'interpolate',
    ['linear'],
    ['get', 'value'],
    ...scale.stops.flatMap(([stop, color]) => [stop, color]),
  ]
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
