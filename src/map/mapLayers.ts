import type { Map } from 'maplibre-gl'
import type { PhenomenonKey } from '../weather/types'
import { circleColorExpression } from './colorScales'
import { heatFillColorExpression } from './heatGrid'

export const STATION_SOURCE = 'senseboxes'
export const HEAT_SOURCE = 'heat-grid'
export const HEAT_LAYER = 'heat-fill'
export const HEATMAP_LAYER = 'heat-glow'
export const CIRCLE_LAYER = 'senseboxes-circle'
export const LABEL_LAYER = 'senseboxes-label'

export function addWeatherMapLayers(map: Map) {
  map.addSource(STATION_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })

  map.addSource(HEAT_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })

  // Soft glow from measurement points
  map.addLayer({
    id: HEATMAP_LAYER,
    type: 'heatmap',
    source: STATION_SOURCE,
    layout: { visibility: 'none' },
    paint: {
      'heatmap-weight': [
        'interpolate',
        ['linear'],
        ['get', 'value'],
        -10, 0,
        40, 1,
      ],
      'heatmap-intensity': 0.9,
      'heatmap-radius': 42,
      'heatmap-opacity': 0.55,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(43,92,255,0)',
        0.2, 'rgba(43,92,255,0.45)',
        0.45, 'rgba(43,181,154,0.55)',
        0.7, 'rgba(227,161,91,0.65)',
        1, 'rgba(224,122,108,0.8)',
      ],
    },
  })

  // Interpolated warmth/cold surface between stations
  map.addLayer({
    id: HEAT_LAYER,
    type: 'fill',
    source: HEAT_SOURCE,
    layout: { visibility: 'none' },
    paint: {
      'fill-color': '#2bb59a',
      'fill-opacity': 0.5,
      'fill-outline-color': 'rgba(0,0,0,0)',
    },
  })

  map.addLayer({
    id: CIRCLE_LAYER,
    type: 'circle',
    source: STATION_SOURCE,
    paint: {
      'circle-radius': 7,
      'circle-color': '#1f7a6c',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 1,
    },
  })

  map.addLayer({
    id: LABEL_LAYER,
    type: 'symbol',
    source: STATION_SOURCE,
    layout: {
      'text-field': ['get', 'label'],
      'text-size': 16,
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-offset': [0, -1.5],
      'text-anchor': 'bottom',
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      visibility: 'none',
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#0d1f24',
      'text-halo-width': 2.4,
    },
    filter: ['has', 'label'],
  })
}

export function applyPhenomenonStyle(map: Map, phenomenon: PhenomenonKey | 'all') {
  const showHeat = phenomenon !== 'all'
  const visibility = showHeat ? 'visible' : 'none'

  if (map.getLayer(HEAT_LAYER)) {
    map.setLayoutProperty(HEAT_LAYER, 'visibility', visibility)
    if (showHeat) {
      map.setPaintProperty(
        HEAT_LAYER,
        'fill-color',
        heatFillColorExpression(phenomenon) as never,
      )
    }
  }

  if (map.getLayer(HEATMAP_LAYER)) {
    map.setLayoutProperty(HEATMAP_LAYER, 'visibility', visibility)
  }

  if (map.getLayer(CIRCLE_LAYER)) {
    map.setPaintProperty(
      CIRCLE_LAYER,
      'circle-color',
      circleColorExpression(phenomenon) as never,
    )
  }

  if (map.getLayer(LABEL_LAYER)) {
    map.setLayoutProperty(LABEL_LAYER, 'visibility', visibility)
  }
}
