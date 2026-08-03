import type { ImageSource, Map } from 'maplibre-gl'
import type { PhenomenonKey } from '../weather/types'
import { circleColorExpression } from './colorScales'
import type { HeatRasterResult } from './heatRaster'

export const STATION_SOURCE = 'senseboxes'
export const HEAT_RASTER_SOURCE = 'heat-raster'
export const HEAT_RASTER_LAYER = 'heat-raster-layer'
export const CIRCLE_LAYER = 'senseboxes-circle'

const EMPTY_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const FALLBACK_COORDS: [
  [number, number],
  [number, number],
  [number, number],
  [number, number],
] = [
  [13.2, 52.6],
  [13.6, 52.6],
  [13.6, 52.4],
  [13.2, 52.4],
]

export function addWeatherMapLayers(map: Map) {
  if (!map.getSource(STATION_SOURCE)) {
    map.addSource(STATION_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
  }

  if (!map.getSource(HEAT_RASTER_SOURCE)) {
    map.addSource(HEAT_RASTER_SOURCE, {
      type: 'image',
      url: EMPTY_PIXEL,
      coordinates: FALLBACK_COORDS,
    })
  }

  if (!map.getLayer(HEAT_RASTER_LAYER)) {
    map.addLayer({
      id: HEAT_RASTER_LAYER,
      type: 'raster',
      source: HEAT_RASTER_SOURCE,
      paint: {
        'raster-opacity': 0.72,
        'raster-fade-duration': 0,
      },
    })
  }

  if (!map.getLayer(CIRCLE_LAYER)) {
    map.addLayer({
      id: CIRCLE_LAYER,
      type: 'circle',
      source: STATION_SOURCE,
      paint: {
        'circle-radius': 5,
        'circle-color': '#1f7a6c',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.95,
      },
    })
  }
}

export function applyPhenomenonStyle(map: Map, phenomenon: PhenomenonKey | 'all') {
  const showHeat = phenomenon !== 'all'

  if (map.getLayer(HEAT_RASTER_LAYER)) {
    map.setLayoutProperty(HEAT_RASTER_LAYER, 'visibility', showHeat ? 'visible' : 'none')
    if (showHeat) {
      map.setPaintProperty(HEAT_RASTER_LAYER, 'raster-opacity', 0.72)
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

export function setHeatRaster(map: Map, raster: HeatRasterResult | null) {
  const source = map.getSource(HEAT_RASTER_SOURCE) as ImageSource | undefined
  if (!source) return

  if (!raster) {
    source.updateImage({ url: EMPTY_PIXEL, coordinates: FALLBACK_COORDS })
    if (map.getLayer(HEAT_RASTER_LAYER)) {
      map.setLayoutProperty(HEAT_RASTER_LAYER, 'visibility', 'none')
    }
    return
  }

  source.updateImage({
    image: raster.canvas,
    coordinates: raster.coordinates,
  })
  if (map.getLayer(HEAT_RASTER_LAYER)) {
    map.setLayoutProperty(HEAT_RASTER_LAYER, 'visibility', 'visible')
  }
}
