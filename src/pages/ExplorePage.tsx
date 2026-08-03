import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { SenseMap, type MapViewport } from '../map/SenseMap'
import { MapLegend } from '../map/MapLegend'
import { StationList } from '../components/StationList'
import { StatusBanner } from '../components/StatusBanner'
import { radiusKmForViewport } from '../weather/bbox'
import { fetchViewportBoxes } from '../weather/fetchViewportBoxes'
import type { LonLat, PhenomenonKey } from '../weather/types'
import type { SenseBox } from '../api/types'

const CENTER: LonLat = { lon: 10.0, lat: 51.2 }

export function ExplorePage() {
  const [center, setCenter] = useState<LonLat>(CENTER)
  const [recenterKey, setRecenterKey] = useState(() => `init-${Date.now()}`)
  const [boxes, setBoxes] = useState<SenseBox[]>([])
  const [freshIds, setFreshIds] = useState<string[]>([])
  const [selectedBoxId, setSelectedBoxId] = useState<string>()
  const [phenomenon, setPhenomenon] = useState<PhenomenonKey | 'all'>('all')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const viewportGen = useRef(0)
  const phenomenonRef = useRef(phenomenon)
  phenomenonRef.current = phenomenon

  const jumpTo = useCallback((next: LonLat) => {
    setCenter(next)
    setRecenterKey(`jump-${next.lon},${next.lat}-${Date.now()}`)
  }, [])

  const handleViewportIdle = useCallback(async (viewport: MapViewport) => {
    const gen = ++viewportGen.current
    setLoading(true)
    setError(null)
    try {
      const radiusKm = radiusKmForViewport(viewport.center, viewport.northEast)
      const result = await fetchViewportBoxes(
        {
          center: viewport.center,
          radiusKm,
        },
        {
          preferPhenomenon:
            phenomenonRef.current === 'all' ? undefined : phenomenonRef.current,
        },
      )
      if (gen !== viewportGen.current) return
      setBoxes(result.boxes)
      setFreshIds(result.freshIds)
      setCenter(viewport.center)
    } catch (err) {
      if (gen !== viewportGen.current) return
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen')
    } finally {
      if (gen === viewportGen.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Seed first load around Germany center until map fires viewport idle.
    let cancelled = false
    void (async () => {
      try {
        const result = await fetchViewportBoxes({ center: CENTER, radiusKm: 120 })
        if (cancelled) return
        setBoxes(result.boxes)
        setFreshIds(result.freshIds)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="section">
      <h2>Exploration</h2>
      <p className="section-lead">
        Karte verschieben oder zoomen lädt Stationen für den Ausschnitt nach. Zurück zum{' '}
        <Link to="/">Live-Wetterbericht</Link>.
      </p>

      {loading && <StatusBanner>Lade senseBoxes…</StatusBanner>}
      {error && <StatusBanner tone="error">{error}</StatusBanner>}

      <div className="map-panel panel">
        <div className="map-toolbar">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => jumpTo({ lon: 13.4, lat: 52.52 })}
          >
            Berlin
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => jumpTo({ lon: 9.99, lat: 53.55 })}
          >
            Hamburg
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => jumpTo({ lon: 11.58, lat: 48.14 })}
          >
            München
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => jumpTo({ lon: 11.077, lat: 49.452 })}
          >
            Nürnberg
          </button>
          {(
            [
              ['all', 'Alle'],
              ['temperature', 'Temperatur'],
              ['humidity', 'Feuchte'],
              ['pm10', 'PM10'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`chip ${phenomenon === key ? 'active' : ''}`}
              onClick={() => setPhenomenon(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <SenseMap
          key={recenterKey}
          center={center}
          recenterKey={recenterKey}
          boxes={boxes}
          freshBoxIds={freshIds}
          phenomenon={phenomenon}
          selectedBoxId={selectedBoxId}
          onSelectBox={setSelectedBoxId}
          onViewportIdle={handleViewportIdle}
          className="sense-map"
        />
        <MapLegend phenomenon={phenomenon} />

        <StationList boxes={boxes} selectedBoxId={selectedBoxId} onSelect={setSelectedBoxId} />
        {selectedBoxId && (
          <p>
            <Link to={`/box/${selectedBoxId}`}>Details zu dieser Station →</Link>
          </p>
        )}
      </div>
    </section>
  )
}
