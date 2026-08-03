import type { LonLat } from './types'

export type GeocodeResult = {
  label: string
  center: LonLat
}

export async function geocodeCity(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', trimmed)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'openSenseMap-live-weather/1.0 (dermag333; educational demo)',
    },
  })

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`)
  }

  const data = (await response.json()) as Array<{
    display_name: string
    lat: string
    lon: string
  }>

  if (!data.length) return null

  return {
    label: shortLabel(data[0].display_name),
    center: {
      lat: Number.parseFloat(data[0].lat),
      lon: Number.parseFloat(data[0].lon),
    },
  }
}

export function detectUserLocation(): Promise<GeocodeResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation wird von diesem Browser nicht unterstützt.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          label: 'Dein Standort',
          center: {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          },
        })
      },
      (error) => {
        reject(new Error(error.message || 'Standort konnte nicht ermittelt werden.'))
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    )
  })
}

function shortLabel(displayName: string): string {
  return displayName.split(',').slice(0, 3).join(',').trim()
}
