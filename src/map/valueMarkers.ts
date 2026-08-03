import { Marker } from 'maplibre-gl'
import type { Map } from 'maplibre-gl'
import type { FeatureCollection, Point } from 'geojson'
import type { MarkerProps } from './markers'

export function syncValueMarkers(
  map: Map,
  stations: FeatureCollection<Point, MarkerProps>,
  existing: Marker[],
  visible: boolean,
): Marker[] {
  for (const marker of existing) marker.remove()
  if (!visible) return []

  return stations.features.flatMap((feature) => {
    const label = feature.properties.label
    if (!label) return []
    const [lon, lat] = feature.geometry.coordinates
    const el = document.createElement('div')
    el.className = 'temp-marker'
    el.textContent = label

    return [
      new Marker({ element: el, anchor: 'bottom', offset: [0, -10] })
        .setLngLat([lon, lat])
        .addTo(map),
    ]
  })
}
