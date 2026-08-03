import { useEffect, useRef, useState } from 'react'
import {
  LngLatBounds,
  Map,
  NavigationControl,
  type GeoJSONSource,
  type MapMouseEvent,
  type Marker,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { SenseBox } from '../api/types'
import type { LonLat, PhenomenonKey } from '../weather/types'
import type { HeatPoint } from './heatGrid'
import { buildHeatRaster } from './heatRaster'
import {
  addWeatherMapLayers,
  applyPhenomenonStyle,
  CIRCLE_LAYER,
  setHeatRaster,
  STATION_SOURCE,
} from './mapLayers'
import { mapStyle } from './mapStyle'
import { boxesToGeoJson } from './markers'
import { syncValueMarkers } from './valueMarkers'

export type MapViewport = {
  center: LonLat
  northEast: LonLat
  zoom: number
}

type SenseMapProps = {
  center: LonLat
  boxes: SenseBox[]
  freshBoxIds: string[]
  phenomenon: PhenomenonKey | 'all'
  selectedBoxId?: string
  onSelectBox?: (boxId: string) => void
  /** When this key changes, map re-fits to stations once (search / locate). */
  recenterKey?: string
  onViewportIdle?: (viewport: MapViewport) => void
  className?: string
  showStats?: boolean
}

export function SenseMap({
  center,
  boxes,
  freshBoxIds,
  phenomenon,
  selectedBoxId,
  onSelectBox,
  recenterKey,
  onViewportIdle,
  className,
  showStats = true,
}: SenseMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const onSelectRef = useRef(onSelectBox)
  const onViewportRef = useRef(onViewportIdle)
  const dataRef = useRef({ boxes, freshBoxIds, phenomenon, center })
  const fittedKeyRef = useRef<string | null>(null)
  const [stats, setStats] = useState({ points: 0, pixels: 0 })
  onSelectRef.current = onSelectBox
  onViewportRef.current = onViewportIdle
  dataRef.current = { boxes, freshBoxIds, phenomenon, center }

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

    let idleTimer = 0
    const emitViewport = () => {
      const bounds = map.getBounds()
      const c = map.getCenter()
      const ne = bounds.getNorthEast()
      onViewportRef.current?.({
        center: { lon: c.lng, lat: c.lat },
        northEast: { lon: ne.lng, lat: ne.lat },
        zoom: map.getZoom(),
      })
    }

    const onLoad = () => {
      try {
        addWeatherMapLayers(map)
        paintFromRef(map)
        map.resize()
        window.clearTimeout(idleTimer)
        idleTimer = window.setTimeout(emitViewport, 200)
      } catch (error) {
        console.error('Map load failed', error)
      }
    }

    map.on('load', onLoad)
    map.on('moveend', () => {
      window.clearTimeout(idleTimer)
      idleTimer = window.setTimeout(emitViewport, 450)
    })

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

    return () => {
      window.clearTimeout(idleTimer)
      for (const marker of markersRef.current) marker.remove()
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!map.isStyleLoaded()) {
      const onReady = () => paintFromRef(map)
      map.once('load', onReady)
      return () => {
        map.off('load', onReady)
      }
    }

    paintFromRef(map)
  }, [boxes, freshBoxIds, phenomenon, center, recenterKey])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedBoxId || !map.isStyleLoaded()) return
    const box = boxes.find((b) => b._id === selectedBoxId)
    const coords = box?.currentLocation?.coordinates
    if (!coords) return
    try {
      map.easeTo({
        center: [coords[0], coords[1]],
        zoom: Math.max(map.getZoom(), 12.5),
        duration: 600,
      })
    } catch {
      // ignore
    }
  }, [selectedBoxId, boxes])

  function paintFromRef(map: Map) {
    const current = dataRef.current
    const stations = boxesToGeoJson(
      current.boxes,
      current.phenomenon,
      new Set(current.freshBoxIds),
    )
    const heatPoints = stationHeatPoints(stations)
    const raster =
      current.phenomenon === 'all' || heatPoints.length === 0
        ? null
        : buildHeatRaster(heatPoints, current.phenomenon)

    setStats({ points: heatPoints.length, pixels: raster?.pixels ?? 0 })

    try {
      addWeatherMapLayers(map)
      const stationSource = map.getSource(STATION_SOURCE) as GeoJSONSource | undefined
      if (!stationSource) return

      stationSource.setData(stations)
      setHeatRaster(map, raster)
      applyPhenomenonStyle(map, current.phenomenon)
      markersRef.current = syncValueMarkers(
        map,
        stations,
        markersRef.current,
        current.phenomenon !== 'all',
        current.phenomenon,
      )

      const key = recenterKey ?? ''
      if (key && key !== fittedKeyRef.current) {
        fittedKeyRef.current = key
        fitToStations(map, heatPoints, current.center)
      }
      map.resize()
    } catch (error) {
      console.error('Map paint failed', error)
    }
  }

  return (
    <div className="map-frame">
      <div ref={containerRef} className={className ?? 'sense-map'} role="presentation" />
      {showStats && (
        <div className="map-live-stats" aria-live="polite">
          {phenomenon === 'all'
            ? `${boxes.length} Stationen`
            : `${stats.points} Messwerte · Wärmefeld aktiv`}
        </div>
      )}
    </div>
  )
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
  try {
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
  } catch {
    // ignore until style ready
  }
}
