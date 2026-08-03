import { useEffect, useRef } from 'react'
import {
  Map,
  NavigationControl,
  type GeoJSONSource,
  type MapMouseEvent,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { SenseBox } from '../api/types'
import type { LonLat, PhenomenonKey } from '../weather/types'
import { circleColorExpression } from './colorScales'
import { mapStyle } from './mapStyle'
import { boxesToGeoJson } from './markers'

type SenseMapProps = {
  center: LonLat
  boxes: SenseBox[]
  freshBoxIds: string[]
  phenomenon: PhenomenonKey | 'all'
  selectedBoxId?: string
  onSelectBox?: (boxId: string) => void
  className?: string
}

const SOURCE_ID = 'senseboxes'
const LAYER_ID = 'senseboxes-circle'
const LABEL_ID = 'senseboxes-label'

export function SenseMap({
  center,
  boxes,
  freshBoxIds,
  phenomenon,
  selectedBoxId,
  onSelectBox,
  className,
}: SenseMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const onSelectRef = useRef(onSelectBox)
  onSelectRef.current = onSelectBox

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new Map({
      container: containerRef.current,
      style: mapStyle,
      center: [center.lon, center.lat],
      zoom: 11,
    })

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    map.on('load', () => {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: LAYER_ID,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'hasValue'], 1],
            9,
            ['==', ['get', 'fresh'], 1],
            7,
            5,
          ],
          'circle-color': '#8a9aa3',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#f4f7f5',
          'circle-opacity': 0.95,
        },
      })

      map.addLayer({
        id: LABEL_ID,
        type: 'symbol',
        source: SOURCE_ID,
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 11,
          'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
          'text-offset': [0, 1.15],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#eef6f3',
          'text-halo-color': '#0d1f24',
          'text-halo-width': 1.4,
        },
        filter: ['==', ['get', 'hasValue'], 1],
      })

      map.on('click', LAYER_ID, (event: MapMouseEvent) => {
        const feature = map.queryRenderedFeatures(event.point, { layers: [LAYER_ID] })[0]
        const id = feature?.properties?.id
        if (typeof id === 'string') onSelectRef.current?.(id)
      })

      map.on('mouseenter', LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', LAYER_ID, () => {
        map.getCanvas().style.cursor = ''
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.easeTo({ center: [center.lon, center.lat], duration: 700 })
  }, [center.lat, center.lon])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const data = boxesToGeoJson(boxes, phenomenon, new Set(freshBoxIds))
    const apply = () => {
      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined
      source?.setData(data)
      if (map.getLayer(LAYER_ID)) {
        map.setPaintProperty(
          LAYER_ID,
          'circle-color',
          circleColorExpression(phenomenon) as never,
        )
      }
      if (map.getLayer(LABEL_ID)) {
        map.setLayoutProperty(
          LABEL_ID,
          'visibility',
          phenomenon === 'all' ? 'none' : 'visible',
        )
      }
    }

    if (map.isStyleLoaded()) apply()
    else map.once('load', apply)
  }, [boxes, freshBoxIds, phenomenon])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedBoxId) return
    const box = boxes.find((b) => b._id === selectedBoxId)
    const coords = box?.currentLocation?.coordinates
    if (!coords) return
    map.easeTo({
      center: [coords[0], coords[1]],
      zoom: Math.max(map.getZoom(), 12.5),
      duration: 600,
    })
  }, [selectedBoxId, boxes])

  return <div ref={containerRef} className={className ?? 'sense-map'} role="presentation" />
}
