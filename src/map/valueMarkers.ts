import { Marker } from 'maplibre-gl'
import type { Map } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import { PHENOMENON_SCALES } from './colorScales'
import type { MarkerProps } from './markers'

export function syncValueMarkers(
  map: Map,
  stations: FeatureCollection<Point, MarkerProps>,
  existing: Marker[],
  visible: boolean,
  phenomenonKey?: keyof typeof PHENOMENON_SCALES,
): Marker[] {
  for (const marker of existing) marker.remove()
  if (!visible) return []

  const stops =
    phenomenonKey && phenomenonKey !== 'all'
      ? PHENOMENON_SCALES[phenomenonKey].stops
      : undefined

  return stations.features.flatMap((feature) => {
    const label = feature.properties.label
    if (!label) return []
    const [lon, lat] = feature.geometry.coordinates
    const el = document.createElement('div')
    el.className = 'temp-marker'
    el.textContent = label
    const accent = stops ? colorForValue(stops, feature.properties.value) : undefined
    if (accent) {
      el.style.borderColor = accent
      el.style.boxShadow = `0 0 0 2px ${accent}55, 0 6px 16px rgba(0, 0, 0, 0.35)`
    }

    return [
      new Marker({ element: el, anchor: 'bottom', offset: [0, -10] })
        .setLngLat([lon, lat])
        .addTo(map),
    ]
  })
}

function colorForValue(stops: Array<[number, string]>, value: number): string {
  if (!Number.isFinite(value)) return stops[0][1]
  if (value <= stops[0][0]) return stops[0][1]
  const last = stops[stops.length - 1]
  if (value >= last[0]) return last[1]
  for (let i = 0; i < stops.length - 1; i += 1) {
    if (value <= stops[i + 1][0]) return stops[i + 1][1]
  }
  return last[1]
}
