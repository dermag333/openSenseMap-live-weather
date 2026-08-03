import type { PhenomenonKey } from '../weather/types'
import { PHENOMENON_SCALES, type ColorStop } from './colorScales'
import type { HeatPoint } from './heatGrid'
import { idwAt } from './heatGrid'

export type HeatRasterResult = {
  canvas: HTMLCanvasElement
  coordinates: [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ]
  pixels: number
}

const POWER = 2

/** Transparent IDW warmth/cold field as a MapLibre image overlay. */
export function buildHeatRaster(
  points: HeatPoint[],
  phenomenon: PhenomenonKey,
  width = 192,
  height = 192,
): HeatRasterResult | null {
  if (points.length === 0) return null

  const lons = points.map((p) => p.lon)
  const lats = points.map((p) => p.lat)
  const spanLon = Math.max(Math.max(...lons) - Math.min(...lons), 0.04)
  const spanLat = Math.max(Math.max(...lats) - Math.min(...lats), 0.03)
  const padLon = spanLon * 0.2
  const padLat = spanLat * 0.2
  const west = Math.min(...lons) - padLon
  const east = Math.max(...lons) + padLon
  const south = Math.min(...lats) - padLat
  const north = Math.max(...lats) + padLat

  const stops = PHENOMENON_SCALES[phenomenon].stops
  const influence = Math.max(spanLon, spanLat) * 0.85
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const image = ctx.createImageData(width, height)
  const data = image.data
  let painted = 0

  for (let row = 0; row < height; row += 1) {
    const lat = north - ((row + 0.5) / height) * (north - south)
    for (let col = 0; col < width; col += 1) {
      const lon = west + ((col + 0.5) / width) * (east - west)
      const value = idwAt(points, lon, lat, POWER)
      if (!Number.isFinite(value)) continue

      const nearest = nearestDistance(points, lon, lat)
      const falloff = Math.max(0, 1 - nearest / influence)
      // Soft edge: smoothstep so the field doesn't look like a hard rectangle.
      const soft = falloff * falloff * (3 - 2 * falloff)
      if (soft < 0.05) continue

      const [r, g, b] = sampleColor(stops, value)
      const i = (row * width + col) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = Math.round(195 * soft)
      painted += 1
    }
  }

  ctx.putImageData(image, 0, 0)

  return {
    canvas,
    coordinates: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
    pixels: painted,
  }
}

function nearestDistance(points: HeatPoint[], lon: number, lat: number): number {
  let min = Number.POSITIVE_INFINITY
  for (const point of points) {
    const dLon = point.lon - lon
    const dLat = point.lat - lat
    const dist = Math.sqrt(dLon * dLon + dLat * dLat)
    if (dist < min) min = dist
  }
  return min
}

function sampleColor(stops: ColorStop[], value: number): [number, number, number] {
  if (value <= stops[0][0]) return hexRgb(stops[0][1])
  const last = stops[stops.length - 1]
  if (value >= last[0]) return hexRgb(last[1])

  for (let i = 0; i < stops.length - 1; i += 1) {
    const [aVal, aHex] = stops[i]
    const [bVal, bHex] = stops[i + 1]
    if (value > bVal) continue
    const t = (value - aVal) / (bVal - aVal)
    const a = hexRgb(aHex)
    const b = hexRgb(bHex)
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ]
  }

  return hexRgb(last[1])
}

function hexRgb(hex: string): [number, number, number] {
  const raw = hex.replace('#', '')
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const n = Number.parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
