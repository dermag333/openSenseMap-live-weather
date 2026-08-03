import type { Map } from 'maplibre-gl'
import type { PhenomenonKey } from '../weather/types'
import { circleColorExpression } from './colorScales'
import { heatFillColorExpression } from './heatGrid'

export const STATION_SOURCE = 'senseboxes'
export const HEAT_SOURCE = 'heat-grid'
export const HEAT_LAYER = 'heat-fill'
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

  // Transparent warmth/cold surface between stations
  map.addLayer({
    id: HEAT_LAYER,
    type: 'fill',
    source: HEAT_SOURCE,
    paint: {
      'fill-color': '#2bb59a',
      'fill-opacity': 0.48,
      'fill-outline-color': 'rgba(0,0,0,0)',
    },
    layout: {
      visibility: 'none',
    },
  })

  // Measurement points
  map.addLayer({
    id: CIRCLE_LAYER,
    type: 'circle',
    source: STATION_SOURCE,
    paint: {
      'circle-radius': [
        'case',
        ['==', ['get', 'hasValue'], 1],
        6,
        ['==', ['get', 'fresh'], 1],
        5,
        4,
      ],
      'circle-color': '#8a9aa3',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#f4f7f5',
      'circle-opacity': 0.95,
    },
  })

  // Numeric labels at measurement locations
  map.addLayer({
    id: LABEL_LAYER,
    type: 'symbol',
    source: STATION_SOURCE,
    layout: {
      'text-field': ['get', 'label'],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-size': 15,
      'text-offset': [0, -1.35],
      'text-anchor': 'bottom',
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      visibility: 'none',
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#0d1f24',
      'text-halo-width': 2,
      'text-halo-blur': 0.2,
    },
    filter: ['==', ['get', 'hasValue'], 1],
  })
}

export function applyPhenomenonStyle(map: Map, phenomenon: PhenomenonKey | 'all') {
  const showHeat = phenomenon !== 'all'

  if (map.getLayer(HEAT_LAYER)) {
    map.setLayoutProperty(HEAT_LAYER, 'visibility', showHeat ? 'visible' : 'none')
    if (showHeat) {
      map.setPaintProperty(
        HEAT_LAYER,
        'fill-color',
        heatFillColorExpression(phenomenon) as never,
      )
    }
  }

  if (map.getLayer(CIRCLE_LAYER)) {
    map.setPaintProperty(
      CIRCLE_LAYER,
      'circle-color',
      circleColorExpression(phenomenon) as never,
    )
  }

  if (map.getLayer(LABEL_LAYER)) {
    map.setLayoutProperty(LABEL_LAYER, 'visibility', showHeat ? 'visible' : 'none')
  }
}
