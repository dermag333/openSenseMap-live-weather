import { apiGet } from './client'
import type { BoxesQuery, SenseBox, Sensor } from './types'

function toParams(query: BoxesQuery): Record<string, string | number | boolean | undefined> {
  return {
    bbox: query.bbox,
    phenomenon: query.phenomenon,
    exposure: query.exposure,
    grouptag: query.grouptag,
    near: query.near,
    maxDistance: query.maxDistance,
    date: query.date,
    'from-date': query.fromDate,
    'to-date': query.toDate,
    limit: query.limit,
    full: query.full,
    minimal: query.minimal,
  }
}

export async function fetchBoxes(
  query: BoxesQuery = {},
  signal?: AbortSignal,
): Promise<SenseBox[]> {
  const data = await apiGet<SenseBox[] | SenseBox>('/boxes', toParams(query), { signal })
  if (!data) return []
  return Array.isArray(data) ? data : [data]
}

export async function fetchBox(boxId: string, signal?: AbortSignal): Promise<SenseBox> {
  return apiGet<SenseBox>(`/boxes/${encodeURIComponent(boxId)}`, undefined, { signal })
}

export async function fetchBoxSensors(boxId: string): Promise<SenseBox> {
  return apiGet<SenseBox>(`/boxes/${encodeURIComponent(boxId)}/sensors`)
}

export type SensorHistoryPoint = {
  value: string
  createdAt: string
  location?: [number, number] | [number, number, number]
}

export async function fetchSensorData(
  boxId: string,
  sensorId: string,
  fromDate?: string,
  toDate?: string,
): Promise<SensorHistoryPoint[]> {
  return apiGet<SensorHistoryPoint[]>(
    `/boxes/${encodeURIComponent(boxId)}/data/${encodeURIComponent(sensorId)}`,
    {
      'from-date': fromDate,
      'to-date': toDate,
      format: 'json',
    },
  )
}

export function findSensor(box: SenseBox, predicate: (s: Sensor) => boolean): Sensor | undefined {
  return box.sensors?.find(predicate)
}
