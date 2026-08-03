import type { SenseBox } from '../api/types'
import { haversineKm } from './bbox'
import type { LonLat } from './types'

/** Prefer geographically spread stations so zoomed-out maps aren't one city cluster. */
export function pickSpreadBoxes(
  boxes: SenseBox[],
  limit: number,
  minSeparationKm: number,
): SenseBox[] {
  if (boxes.length <= limit) return boxes

  const ranked = [...boxes].sort((a, b) => {
    const aTime = a.lastMeasurementAt ? Date.parse(a.lastMeasurementAt) : 0
    const bTime = b.lastMeasurementAt ? Date.parse(b.lastMeasurementAt) : 0
    return bTime - aTime
  })

  const picked: SenseBox[] = []
  const leftovers: SenseBox[] = []

  for (const box of ranked) {
    const point = coordsOf(box)
    if (!point) continue
    const tooClose = picked.some((other) => {
      const otherPoint = coordsOf(other)
      return otherPoint ? haversineKm(point, otherPoint) < minSeparationKm : false
    })
    if (tooClose) leftovers.push(box)
    else {
      picked.push(box)
      if (picked.length >= limit) return picked
    }
  }

  for (const box of leftovers) {
    if (picked.length >= limit) break
    picked.push(box)
  }

  return picked
}

function coordsOf(box: SenseBox): LonLat | null {
  const coords = box.currentLocation?.coordinates
  if (!coords || coords.length < 2) return null
  return { lon: coords[0], lat: coords[1] }
}
