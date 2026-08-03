import type { SenseBox } from '../api/types'

export function isFreshBox(box: SenseBox, freshnessHours: number, now = Date.now()): boolean {
  if (!box.lastMeasurementAt) return false
  const ageMs = now - Date.parse(box.lastMeasurementAt)
  if (Number.isNaN(ageMs) || ageMs < 0) return false
  return ageMs <= freshnessHours * 60 * 60 * 1000
}

export function filterFreshBoxes(
  boxes: SenseBox[],
  freshnessHours: number,
  preferOutdoor: boolean,
): SenseBox[] {
  const fresh = boxes.filter((box) => isFreshBox(box, freshnessHours))
  if (!preferOutdoor) return fresh

  const outdoor = fresh.filter((box) => (box.exposure || '').toLowerCase() === 'outdoor')
  // Keep indoor/unknown if outdoor coverage is thin — flagged later in quality warnings
  return outdoor.length >= 3 ? outdoor : fresh
}

export function measurementAgeHours(iso: string, now = Date.now()): number {
  return (now - Date.parse(iso)) / (60 * 60 * 1000)
}
