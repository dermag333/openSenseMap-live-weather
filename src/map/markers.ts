import type { SenseBox } from '../api/types'
import type { PhenomenonKey } from '../weather/types'
import { classifySensor } from '../weather/phenomena'
import { formatValueLabel, PHENOMENON_SCALES } from './colorScales'
import type { FeatureCollection, Point } from 'geojson'

export type MarkerProps = {
  id: string
  name: string
  exposure?: string
  fresh: number
  hasValue: number
  value: number
  unit: string
  label: string
}

export function boxesToGeoJson(
  boxes: SenseBox[],
  phenomenon: PhenomenonKey | 'all',
  freshIds: Set<string>,
): FeatureCollection<Point, MarkerProps> {
  const scaleUnit = phenomenon === 'all' ? '' : PHENOMENON_SCALES[phenomenon].unit

  const features = boxes.flatMap((box) => {
    const coords = box.currentLocation?.coordinates
    if (!coords || coords.length < 2) return []

    let value = Number.NaN
    let unit = scaleUnit
    let hasValue = 0

    if (phenomenon !== 'all') {
      const sensor = box.sensors?.find((s) => classifySensor(s)?.key === phenomenon)
      const measurement = sensor?.lastMeasurement
      if (measurement && typeof measurement === 'object' && 'value' in measurement) {
        const parsed = Number.parseFloat(measurement.value)
        if (Number.isFinite(parsed)) {
          value = parsed
          unit = phenomenon === 'pressure' ? 'hPa' : sensor?.unit || scaleUnit
          hasValue = 1
        }
      }
    }

    // When filtering a phenomenon, skip stations without that measurement.
    if (phenomenon !== 'all' && hasValue === 0) return []

    return [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [coords[0], coords[1]],
        },
        properties: {
          id: box._id,
          name: box.name,
          exposure: box.exposure,
          fresh: freshIds.has(box._id) ? 1 : 0,
          hasValue,
          value: hasValue ? value : 0,
          unit,
          label: hasValue ? formatValueLabel(value, unit) : '',
        },
      },
    ]
  })

  return { type: 'FeatureCollection', features }
}
