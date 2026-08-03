import { useEffect, useRef } from 'react'
import { Map, NavigationControl, type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { SenseBox } from '../api/types'
import type { LonLat, PhenomenonKey } from '../weather/types'
import { buildHeatGrid, extractHeatPoints } from './heatGrid'
import {
  addWeatherMapLayers,
  applyPhenomenonStyle,
  CIRCLE_LAYER,
  HEAT_SOURCE,
  STATION_SOURCE,
} from './mapLayers'
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
      addWeatherMapLayers(map)

      map.on('click', CIRCLE_LAYER, (event: MapMouseEvent) => {
        const feature = map.queryRenderedFeatures(event.point, {
          layers: [CIRCLE_LAYER],
        })[0]
        const id = feature?.properties?.id
        if (typeof id === 'string') onSelectRef.current?.(id)
      })

      map.on('mouseenter', CIRCLE_LAYER, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', CIRCLE_LAYER, () => {
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

    const stations = boxesToGeoJson(boxes, phenomenon, new Set(freshBoxIds))
    const heatPoints = extractHeatPoints(stations.features)
    const heat = phenomenon === 'all' ? emptyFc() : buildHeatGrid(heatPoints)

    const apply = () => {
      const stationSource = map.getSource(STATION_SOURCE) as GeoJSONSource | undefined
      const heatSource = map.getSource(HEAT_SOURCE) as GeoJSONSource | undefined
      stationSource?.setData(stations)
      heatSource?.setData(heat)
      applyPhenomenonStyle(map, phenomenon)
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

function emptyFc() {
  return { type: 'FeatureCollection' as const, features: [] }
}
