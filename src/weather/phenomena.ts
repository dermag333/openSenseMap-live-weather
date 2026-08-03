import type { SenseBox, Sensor } from '../api/types'
import type { PhenomenonKey, PhenomenonSample } from './types'

type PhenomenonRule = {
  key: PhenomenonKey
  label: string
  match: RegExp
  min: number
  max: number
}

export const PHENOMENA: PhenomenonRule[] = [
  {
    key: 'temperature',
    label: 'Temperatur',
    match: /temp|temperatur|temperature/i,
    min: -40,
    max: 55,
  },
  {
    key: 'humidity',
    label: 'Luftfeuchtigkeit',
    match: /feucht|humidity|rel\.?\s*humidity|luftfeuchte/i,
    min: 0,
    max: 100,
  },
  {
    key: 'pressure',
    label: 'Luftdruck',
    match: /druck|pressure|baro/i,
    min: 850,
    max: 1100,
  },
  {
    key: 'pm10',
    label: 'PM10',
    match: /pm10|pm\s*10/i,
    min: 0,
    max: 500,
  },
  {
    key: 'pm25',
    label: 'PM2.5',
    match: /pm2\.?5|pm\s*2\.?5/i,
    min: 0,
    max: 500,
  },
  {
    key: 'illuminance',
    label: 'Helligkeit',
    match: /helligkeit|illuminance|brightness|lux/i,
    min: 0,
    max: 200000,
  },
]

export function classifySensor(sensor: Sensor): PhenomenonRule | undefined {
  return PHENOMENA.find((rule) => rule.match.test(sensor.title))
}

function normalizePressure(value: number, unit: string): number {
  if (/pa/i.test(unit) && !/hpa/i.test(unit) && value > 2000) {
    return value / 100
  }
  return value
}

export type TaggedSample = PhenomenonSample & { key: PhenomenonKey }

export function extractSamples(boxes: SenseBox[]): TaggedSample[] {
  const samples: TaggedSample[] = []

  for (const box of boxes) {
    const [lon, lat] = box.currentLocation?.coordinates ?? []
    for (const sensor of box.sensors ?? []) {
      const rule = classifySensor(sensor)
      if (!rule || !sensor.lastMeasurement?.value) continue

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

  return samples
}

export function phenomenonLabel(key: PhenomenonKey): string {
  return PHENOMENA.find((p) => p.key === key)?.label ?? key
}
