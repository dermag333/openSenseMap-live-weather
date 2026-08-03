import { fetchBox } from '../api/boxes'
import type { SenseBox } from '../api/types'

/** List endpoints often return lastMeasurement as ObjectId strings — hydrate for real values. */
export async function hydrateBoxes(
  boxes: SenseBox[],
  limit = 30,
  concurrency = 3,
): Promise<SenseBox[]> {
  const targets = boxes.slice(0, limit)
  const results: SenseBox[] = []

  for (let i = 0; i < targets.length; i += concurrency) {
    const chunk = targets.slice(i, i + concurrency)
    const hydrated = await Promise.all(chunk.map((box) => hydrateOne(box)))
    results.push(...hydrated)
  }

  return results
}

async function hydrateOne(box: SenseBox, attempts = 3): Promise<SenseBox> {
  let last: SenseBox = box
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const full = await fetchBox(box._id)
      if (hasPopulatedMeasurements(full)) return full
      last = full
    } catch {
      // retry below
    }
    await wait(150 * (attempt + 1))
  }
  return last
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export function hasPopulatedMeasurements(box: SenseBox): boolean {
  return (box.sensors ?? []).some(
    (sensor) =>
      sensor.lastMeasurement !== null &&
      typeof sensor.lastMeasurement === 'object' &&
      'value' in sensor.lastMeasurement,
  )
}
