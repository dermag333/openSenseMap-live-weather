import { fetchBox } from '../api/boxes'
import type { SenseBox } from '../api/types'
import { debug } from '../debug/logger'

/** List endpoints often return lastMeasurement as ObjectId strings — hydrate for real values. */
export async function hydrateBoxes(
  boxes: SenseBox[],
  limit = 30,
  concurrency = 3,
): Promise<SenseBox[]> {
  const targets = boxes.slice(0, limit)
  debug.info('hydrate', 'start', { targets: targets.length, concurrency })
  const results: SenseBox[] = []
  let ok = 0
  let fail = 0

  for (let i = 0; i < targets.length; i += concurrency) {
    const chunk = targets.slice(i, i + concurrency)
    const hydrated = await Promise.all(chunk.map((box) => hydrateOne(box)))
    for (const box of hydrated) {
      if (hasPopulatedMeasurements(box)) ok += 1
      else fail += 1
    }
    results.push(...hydrated)
  }

  debug.info('hydrate', 'done', { ok, emptyOrFailed: fail })
  return results
}

async function hydrateOne(box: SenseBox, attempts = 3): Promise<SenseBox> {
  let last: SenseBox = box
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const full = await fetchBox(box._id)
      if (hasPopulatedMeasurements(full)) return full
      last = full
      debug.warn('hydrate', 'no measurements yet', { id: box._id, attempt: attempt + 1 })
    } catch (error) {
      debug.warn('hydrate', 'request failed', {
        id: box._id,
        attempt: attempt + 1,
        error: error instanceof Error ? error.message : error,
      })
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
