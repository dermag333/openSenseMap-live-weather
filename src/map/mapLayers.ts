import type { Map } from 'maplibre-gl'
import type { PhenomenonKey } from '../weather/types'
import { circleColorExpression } from './colorScales'
import { heatFillColorExpression } from './heatGrid'

export const STATION_SOURCE = 'senseboxes'
export const HEAT_SOURCE = 'heat-grid'
export const HEAT_LAYER = 'heat-fill'
export const CIRCLE_LAYER = 'senseboxes-circle'

export function addWeatherMapLayers(map: Map) {
  if (!map.getSource(STATION_SOURCE)) {
    map.addSource(STATION_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }

  if (!map.getSource(HEAT_SOURCE)) {
    map.addSource(HEAT_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }

  if (!map.getLayer(HEAT_LAYER)) {
    map.addLayer({
      id: HEAT_LAYER,
      type: 'fill',
      source: HEAT_SOURCE,
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'value'],
          -10, '#2b5cff',
          0, '#4aa3ff',
          10, '#6fd6c0',
          18, '#2bb59a',
          24, '#e3a15b',
          32, '#e07a6c',
          38, '#c23b2e',
        ],
        'fill-opacity': 0.58,
      },
    })
  }

  if (!map.getLayer(CIRCLE_LAYER)) {
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
  }
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
      map.setPaintProperty(HEAT_LAYER, 'fill-opacity', 0.58)
    }
  }

  if (map.getLayer(CIRCLE_LAYER)) {
    map.setPaintProperty(
      CIRCLE_LAYER,
      'circle-color',
      circleColorExpression(phenomenon) as never,
    )
  }
}
