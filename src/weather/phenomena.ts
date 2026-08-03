import type { SenseBox, Sensor } from '../api/types'
import type { PhenomenonKey, PhenomenonSample } from './types'

type PhenomenonRule = {
  key: PhenomenonKey
  label: string
  match: RegExp
  exclude?: RegExp
  min: number
  max: number
}

export const PHENOMENA: PhenomenonRule[] = [
  {
    key: 'temperature',
    label: 'Temperatur',
    match: /temp|temperatur|temperature/i,
    exclude: /boden|soil|wasser|water|indoor/i,
    min: -25,
    max: 45,
  },
  {
    key: 'humidity',
    label: 'Luftfeuchtigkeit',
    match: /feucht|humidity|rel\.?\s*humidity|luftfeuchte/i,
    min: 5,
    max: 100,
  },
  {
    key: 'pressure',
    label: 'Luftdruck',
    match: /druck|pressure|baro/i,
    min: 900,
    max: 1100,
  },
  {
    key: 'pm10',
    label: 'PM10',
    match: /pm10|pm\s*10/i,
    min: 0,
    max: 300,
  },
  {
    key: 'pm25',
    label: 'PM2.5',
    match: /pm2\.?5|pm\s*2\.?5/i,
    min: 0,
    max: 300,
  },
  {
    key: 'illuminance',
    label: 'Helligkeit',
    match: /helligkeit|illuminance|brightness|lux|beleucht/i,
    min: 0,
    max: 200000,
  },
]

export function classifySensor(sensor: Sensor): PhenomenonRule | undefined {
  return PHENOMENA.find(
    (rule) => rule.match.test(sensor.title) && !rule.exclude?.test(sensor.title),
  )
}

function normalizePressure(value: number, unit: string): number {
  if (/pa/i.test(unit) && !/hpa/i.test(unit) && value > 2000) {
    return value / 100
  }
  return value
}

function isPopulatedMeasurement(
  value: Sensor['lastMeasurement'],
): value is { createdAt: string; value: string } {
  return Boolean(value && typeof value === 'object' && 'value' in value)
}

export type TaggedSample = PhenomenonSample & { key: PhenomenonKey }

export function extractSamples(boxes: SenseBox[]): TaggedSample[] {
  const samples: TaggedSample[] = []

  for (const box of boxes) {
    const [lon, lat] = box.currentLocation?.coordinates ?? []
    for (const sensor of box.sensors ?? []) {
      const rule = classifySensor(sensor)
      if (!rule || !isPopulatedMeasurement(sensor.lastMeasurement)) continue

      let value = Number.parseFloat(sensor.lastMeasurement.value)
      if (!Number.isFinite(value)) continue

      if (rule.key === 'pressure') {
        value = normalizePressure(value, sensor.unit || '')
      }

      if (value < rule.min || value > rule.max) continue

      samples.push({
        key: rule.key,
        boxId: box._id,
        boxName: box.name,
        sensorId: sensor._id,
        value,
        unit: rule.key === 'pressure' ? 'hPa' : sensor.unit,
        measuredAt: sensor.lastMeasurement.createdAt,
        exposure: box.exposure,
        lon: typeof lon === 'number' ? lon : undefined,
        lat: typeof lat === 'number' ? lat : undefined,
      })
    }
  }

  return rejectStatisticalOutliers(samples)
}

/** Drop extreme sensor faults (e.g. -141°C) via IQR fence per phenomenon. */
function rejectStatisticalOutliers(samples: TaggedSample[]): TaggedSample[] {
  const byKey = new Map<PhenomenonKey, TaggedSample[]>()
  for (const sample of samples) {
    const list = byKey.get(sample.key) ?? []
    list.push(sample)
    byKey.set(sample.key, list)
  }

  const kept: TaggedSample[] = []
  for (const [, list] of byKey) {
    if (list.length < 4) {
      kept.push(...list)
      continue
    }
    const values = list.map((s) => s.value).sort((a, b) => a - b)
    const q1 = quantile(values, 0.25)
    const q3 = quantile(values, 0.75)
    const iqr = q3 - q1
    const low = q1 - 1.5 * iqr
    const high = q3 + 1.5 * iqr
    kept.push(...list.filter((s) => s.value >= low && s.value <= high))
  }
  return kept
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const next = sorted[base + 1]
  if (next === undefined) return sorted[base]
  return sorted[base] + rest * (next - sorted[base])
}

export function phenomenonLabel(key: PhenomenonKey): string {
  return PHENOMENA.find((p) => p.key === key)?.label ?? key
}
