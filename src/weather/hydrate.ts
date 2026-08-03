import { fetchBox } from '../api/boxes'
import type { SenseBox } from '../api/types'

/** List endpoints often return lastMeasurement as ObjectId strings — hydrate for real values. */
export async function hydrateBoxes(
  boxes: SenseBox[],
  limit = 30,
  concurrency = 6,
): Promise<SenseBox[]> {
  const targets = boxes.slice(0, limit)
  const results: SenseBox[] = []

  for (let i = 0; i < targets.length; i += concurrency) {
    const chunk = targets.slice(i, i + concurrency)
    const hydrated = await Promise.all(
      chunk.map(async (box) => {
        try {
          return await fetchBox(box._id)
        } catch {
          return box
        }
      }),
    )
    results.push(...hydrated)
  }

  return results
}

export function hasPopulatedMeasurements(box: SenseBox): boolean {
  return (box.sensors ?? []).some(
    (sensor) =>
      sensor.lastMeasurement !== null &&
      typeof sensor.lastMeasurement === 'object' &&
      'value' in sensor.lastMeasurement,
  )
}
