import { useEffect, useRef } from 'react'
import {
  LngLatBounds,
  Map,
  NavigationControl,
  type GeoJSONSource,
  type MapMouseEvent,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { SenseBox } from '../api/types'
import type { LonLat, PhenomenonKey } from '../weather/types'
import { buildHeatGrid } from './heatGrid'
import {
  addWeatherMapLayers,
  applyPhenomenonStyle,
  CIRCLE_LAYER,
  HEAT_SOURCE,
  STATION_SOURCE,
} from './mapLayers'
import { mapStyle } from './mapStyle'
import { boxesToGeoJson } from './markers'
import type { HeatPoint } from './heatGrid'

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
  const pendingRef = useRef<null | (() => void)>(null)
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
      try {
        addWeatherMapLayers(map)
      } catch (error) {
        console.error('Failed to add weather layers', error)
      }
      map.resize()
      pendingRef.current?.()
      pendingRef.current = null

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
      pendingRef.current = null
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
    const heatPoints = stationHeatPoints(stations)
    const heat =
      phenomenon === 'all' || heatPoints.length === 0
        ? { type: 'FeatureCollection' as const, features: [] }
        : buildHeatGrid(heatPoints, 36, 36)

    const apply = () => {
      const stationSource = map.getSource(STATION_SOURCE) as GeoJSONSource | undefined
      const heatSource = map.getSource(HEAT_SOURCE) as GeoJSONSource | undefined
      if (!stationSource || !heatSource) return false

      stationSource.setData(stations)
      heatSource.setData(heat)
      applyPhenomenonStyle(map, phenomenon)
      fitToStations(map, heatPoints, center)
      map.resize()
      return true
    }

    if (!apply()) {
      pendingRef.current = () => {
        apply()
      }
    }
  }, [boxes, freshBoxIds, phenomenon, center])

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

function stationHeatPoints(
  stations: ReturnType<typeof boxesToGeoJson>,
): HeatPoint[] {
  return stations.features.flatMap((feature) => {
    if (feature.geometry.type !== 'Point') return []
    const { hasValue, value } = feature.properties
    if (Number(hasValue) !== 1 || !Number.isFinite(value)) return []
    const [lon, lat] = feature.geometry.coordinates
    return [{ lon, lat, value }]
  })
}

function fitToStations(map: Map, points: HeatPoint[], fallback: LonLat) {
  if (points.length === 0) {
    map.easeTo({ center: [fallback.lon, fallback.lat], zoom: 11, duration: 500 })
    return
  }
  if (points.length === 1) {
    map.easeTo({ center: [points[0].lon, points[0].lat], zoom: 12.8, duration: 600 })
    return
  }
  const bounds = points.reduce(
    (b, p) => b.extend([p.lon, p.lat]),
    new LngLatBounds([points[0].lon, points[0].lat], [points[0].lon, points[0].lat]),
  )
  map.fitBounds(bounds, { padding: 64, maxZoom: 12.8, duration: 700 })
}
