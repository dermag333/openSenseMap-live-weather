import type { Map } from 'maplibre-gl'
import type { PhenomenonKey } from '../weather/types'
import { circleColorExpression, PHENOMENON_SCALES } from './colorScales'
import { heatFillColorExpression } from './heatGrid'

export const STATION_SOURCE = 'senseboxes'
export const HEAT_SOURCE = 'heat-grid'
export const HEAT_LAYER = 'heat-fill'
export const HEATMAP_LAYER = 'heat-glow'
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
          ['to-number', ['get', 'value']],
          -10, '#2b5cff',
          0, '#4aa3ff',
          10, '#6fd6c0',
          18, '#2bb59a',
          24, '#e3a15b',
          32, '#e07a6c',
          38, '#c23b2e',
        ],
        'fill-opacity': 0.62,
      },
    })
  }

  // Soft colored field around stations (visible even if fill grid fails)
  if (!map.getLayer(HEATMAP_LAYER)) {
    map.addLayer({
      id: HEATMAP_LAYER,
      type: 'heatmap',
      source: STATION_SOURCE,
      paint: {
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['to-number', ['get', 'value']],
          -10, 0.05,
          10, 0.35,
          20, 0.6,
          30, 0.85,
          40, 1,
        ],
        'heatmap-intensity': 1.15,
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 24,
          11, 48,
          14, 70,
        ],
        'heatmap-opacity': 0.72,
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(43,92,255,0)',
          0.15, 'rgba(43,92,255,0.45)',
          0.35, 'rgba(43,181,154,0.55)',
          0.55, 'rgba(227,161,91,0.65)',
          0.75, 'rgba(224,122,108,0.78)',
          1, 'rgba(194,59,46,0.88)',
        ],
      },
    })
  }

  if (!map.getLayer(CIRCLE_LAYER)) {
    map.addLayer({
      id: CIRCLE_LAYER,
      type: 'circle',
      source: STATION_SOURCE,
      paint: {
        'circle-radius': 6,
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
  const visibility = showHeat ? 'visible' : 'none'

  if (map.getLayer(HEAT_LAYER)) {
    map.setLayoutProperty(HEAT_LAYER, 'visibility', visibility)
    if (showHeat) {
      map.setPaintProperty(
        HEAT_LAYER,
        'fill-color',
        heatFillColorExpression(phenomenon) as never,
      )
      map.setPaintProperty(HEAT_LAYER, 'fill-opacity', 0.55)
    }
  }

  if (map.getLayer(HEATMAP_LAYER)) {
    map.setLayoutProperty(HEATMAP_LAYER, 'visibility', visibility)
    if (showHeat) {
      const stops = PHENOMENON_SCALES[phenomenon].stops
      const min = stops[0][0]
      const max = stops[stops.length - 1][0]
      map.setPaintProperty(HEATMAP_LAYER, 'heatmap-weight', [
        'interpolate',
        ['linear'],
        ['to-number', ['get', 'value']],
        min, 0.1,
        (min + max) / 2, 0.55,
        max, 1,
      ] as never)
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
