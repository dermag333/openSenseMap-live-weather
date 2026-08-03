import type { SenseBox } from '../api/types'
import type { PhenomenonKey } from '../weather/types'
import { classifySensor } from '../weather/phenomena'
import type { FeatureCollection, Point } from 'geojson'

export type MarkerProps = {
  id: string
  name: string
  exposure?: string
  fresh: boolean
  value?: number
  unit?: string
}

export function boxesToGeoJson(
  boxes: SenseBox[],
  phenomenon: PhenomenonKey | 'all',
  freshIds: Set<string>,
): FeatureCollection<Point, MarkerProps> {
  const features = boxes.flatMap((box) => {
    const coords = box.currentLocation?.coordinates
    if (!coords || coords.length < 2) return []

    let value: number | undefined
    let unit: string | undefined

    if (phenomenon !== 'all') {
      const sensor = box.sensors?.find((s) => classifySensor(s)?.key === phenomenon)
      const measurement = sensor?.lastMeasurement
      if (measurement && typeof measurement === 'object' && 'value' in measurement) {
        value = Number.parseFloat(measurement.value)
        unit = sensor?.unit
      }
    }

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
          fresh: freshIds.has(box._id),
          value: Number.isFinite(value) ? value : undefined,
          unit,
        },
      },
    ]
  })

  return { type: 'FeatureCollection', features }
}
