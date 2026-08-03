import type { PhenomenonKey } from '../weather/types'

export type ColorStop = [number, string]

export type PhenomenonScale = {
  key: PhenomenonKey | 'all'
  label: string
  unit: string
  stops: ColorStop[]
  missingColor: string
}

export const PHENOMENON_SCALES: Record<PhenomenonKey | 'all', PhenomenonScale> = {
  all: {
    key: 'all',
    label: 'Stationen',
    unit: '',
    stops: [
      [0, '#8a9aa3'],
      [1, '#1f7a6c'],
    ],
    missingColor: '#8a9aa3',
  },
  temperature: {
    key: 'temperature',
    label: 'Temperatur',
    unit: '°C',
    stops: [
      [-10, '#2b5cff'],
      [0, '#4aa3ff'],
      [10, '#6fd6c0'],
      [18, '#2bb59a'],
      [24, '#e3a15b'],
      [32, '#e07a6c'],
      [40, '#c23b2e'],
      [50, '#8b1e14'],
    ],
    missingColor: '#4a5a60',
  },
  humidity: {
    key: 'humidity',
    label: 'Luftfeuchtigkeit',
    unit: '%',
    stops: [
      [20, '#e3a15b'],
      [40, '#c9c07a'],
      [55, '#2bb59a'],
      [70, '#4aa3ff'],
      [85, '#2b5cff'],
    ],
    missingColor: '#4a5a60',
  },
  pressure: {
    key: 'pressure',
    label: 'Luftdruck',
    unit: 'hPa',
    stops: [
      [980, '#2b5cff'],
      [1000, '#4aa3ff'],
      [1013, '#2bb59a'],
      [1025, '#e3a15b'],
      [1040, '#e07a6c'],
    ],
    missingColor: '#4a5a60',
  },
  pm10: {
    key: 'pm10',
    label: 'PM10',
    unit: 'µg/m³',
    stops: [
      [0, '#2bb59a'],
      [20, '#c9c07a'],
      [40, '#e3a15b'],
      [75, '#e07a6c'],
      [100, '#c23b2e'],
    ],
    missingColor: '#4a5a60',
  },
  pm25: {
    key: 'pm25',
    label: 'PM2.5',
    unit: 'µg/m³',
    stops: [
      [0, '#2bb59a'],
      [10, '#c9c07a'],
      [25, '#e3a15b'],
      [50, '#e07a6c'],
      [75, '#c23b2e'],
    ],
    missingColor: '#4a5a60',
  },
  illuminance: {
    key: 'illuminance',
    label: 'Helligkeit',
    unit: '',
    stops: [
      [0, '#1a2a30'],
      [500, '#4a6a72'],
      [5000, '#e3a15b'],
      [20000, '#f0e6b0'],
    ],
    missingColor: '#4a5a60',
  },
}

export function circleColorExpression(phenomenon: PhenomenonKey | 'all'): unknown[] {
  if (phenomenon === 'all') {
    return ['case', ['==', ['get', 'fresh'], 1], '#1f7a6c', '#8a9aa3']
  }

  const scale = PHENOMENON_SCALES[phenomenon]
  return [
    'case',
    ['==', ['get', 'hasValue'], 1],
    [
      'interpolate',
      ['linear'],
      ['get', 'value'],
      ...scale.stops.flatMap(([stop, color]) => [stop, color]),
    ],
    scale.missingColor,
  ]
}

export function formatValueLabel(value: number, unit: string): string {
  const digits = unit === 'hPa' || unit === '%' ? 0 : 1
  return `${value.toFixed(digits)}${unit ? ` ${unit}` : ''}`
}
