export type GeoPoint = {
  type: 'Point'
  coordinates: [number, number] | [number, number, number]
  timestamp?: string
}

export type Measurement = {
  createdAt: string
  value: string
}

export type Sensor = {
  _id: string
  title: string
  unit: string
  sensorType?: string
  lastMeasurement?: Measurement | null
}

export type SenseBox = {
  _id: string
  name: string
  exposure?: string
  grouptag?: string[] | string
  model?: string
  currentLocation?: GeoPoint
  lastMeasurementAt?: string
  sensors?: Sensor[]
  createdAt?: string
  updatedAt?: string
}

export type PlatformStats = [number, number, number]

export type BoxesQuery = {
  bbox?: string
  phenomenon?: string
  exposure?: string
  grouptag?: string
  near?: string
  maxDistance?: number
  date?: string
  fromDate?: string
  toDate?: string
  limit?: number
  full?: boolean
  minimal?: boolean
}

export class ApiError extends Error {
  status: number
  body: string

  constructor(message: string, status: number, body: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}
