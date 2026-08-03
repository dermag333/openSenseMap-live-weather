import type { SenseBox } from '../api/types'

export type LonLat = { lon: number; lat: number }

export type BBox = {
  west: number
  south: number
  east: number
  north: number
}

export type PhenomenonKey =
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'pm10'
  | 'pm25'
  | 'illuminance'

export type PhenomenonSample = {
  boxId: string
  boxName: string
  sensorId: string
  value: number
  unit: string
  measuredAt: string
  exposure?: string
  lon?: number
  lat?: number
}

export type AggregatedMetric = {
  key: PhenomenonKey
  label: string
  unit: string
  median: number
  mean: number
  min: number
  max: number
  count: number
  samples: PhenomenonSample[]
}

export type WeatherQuality = {
  stationCount: number
  freshStationCount: number
  radiusKm: number
  freshnessHours: number
  oldestFreshAt?: string
  newestFreshAt?: string
  warnings: string[]
}

export type WeatherReport = {
  headline: string
  summary: string
  insights: string[]
  qualityLine: string
}

export type WeatherSnapshot = {
  locationLabel: string
  center: LonLat
  bbox: BBox
  metrics: Partial<Record<PhenomenonKey, AggregatedMetric>>
  boxes: SenseBox[]
  freshBoxes: SenseBox[]
  quality: WeatherQuality
  report: WeatherReport
  generatedAt: string
}

export type WeatherOptions = {
  radiusKm?: number
  freshnessHours?: number
  preferOutdoor?: boolean
  minStations?: number
}
