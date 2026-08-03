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
          'circle-radius': ['case', ['boolean', ['get', 'fresh'], false], 8, 5],
          'circle-color': [
            'case',
            ['boolean', ['get', 'fresh'], false],
            '#1f7a6c',
            '#8a9aa3',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#f4f7f5',
          'circle-opacity': 0.92,
        },
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
