import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Hero } from '../components/Hero'
import { StatusBanner } from '../components/StatusBanner'
import { WeatherReportView } from '../components/WeatherReport'
import { StationList } from '../components/StationList'
import { MapLegend } from '../map/MapLegend'
import { SenseMap, type MapViewport } from '../map/SenseMap'
import { boxesToGeoJson } from '../map/markers'
import { radiusKmForViewport } from '../weather/bbox'
import { buildWeatherSnapshot } from '../weather/buildWeather'
import { fetchViewportBoxes } from '../weather/fetchViewportBoxes'
import { detectUserLocation, geocodeCity } from '../weather/geocode'
import type { LonLat, PhenomenonKey, WeatherSnapshot } from '../weather/types'
import type { SenseBox } from '../api/types'
import { ApiError } from '../api/types'

const DEFAULT_CENTER: LonLat = { lon: 13.405, lat: 52.52 }

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export function HomePage() {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null)
  const [center, setCenter] = useState<LonLat>(DEFAULT_CENTER)
  const [status, setStatus] = useState<LoadState>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [selectedBoxId, setSelectedBoxId] = useState<string>()
  const [phenomenon, setPhenomenon] = useState<PhenomenonKey | 'all'>('temperature')
  const [mapBoxes, setMapBoxes] = useState<SenseBox[]>([])
  const [mapFreshIds, setMapFreshIds] = useState<string[]>([])
  const [mapLoading, setMapLoading] = useState(false)
  const [mapRadiusKm, setMapRadiusKm] = useState(0)
  const viewportGen = useRef(0)
  const loadGen = useRef(0)
  const phenomenonRef = useRef(phenomenon)
  phenomenonRef.current = phenomenon

  const loadAt = useCallback(async (nextCenter: LonLat, label: string) => {
    // Invalidate in-flight viewport fetches so they cannot overwrite this load.
    viewportGen.current += 1
    const myLoad = ++loadGen.current
    setStatus('loading')
    setMessage(null)
    setCenter(nextCenter)
    try {
      const next = await buildWeatherSnapshot(nextCenter, label)
      if (myLoad !== loadGen.current) return
      setSnapshot(next)
      // Seed with hydrated fresh stations only; map viewport fetch fills the view.
      setMapBoxes(next.freshBoxes)
      setMapFreshIds(next.freshBoxes.map((box) => box._id))
      setSelectedBoxId(next.freshBoxes[0]?._id)
      setMapRadiusKm(next.quality.radiusKm)
      setStatus('ready')
      if (next.freshBoxes.length === 0) {
        setMessage('Keine frischen Stationen gefunden. Probiere einen anderen Ort.')
      }
    } catch (error) {
      if (myLoad !== loadGen.current) return
      setStatus('error')
      setMessage(formatError(error))
    }
  }, [])

  useEffect(() => {
    void loadAt(DEFAULT_CENTER, 'Berlin')
  }, [loadAt])

  const handleViewportIdle = useCallback(async (viewport: MapViewport) => {
    const gen = ++viewportGen.current
    const loadSnapshot = loadGen.current
    setMapLoading(true)
    try {
      const radiusKm = radiusKmForViewport(viewport.center, viewport.northEast)
      const result = await fetchViewportBoxes(
        {
          center: viewport.center,
          radiusKm,
        },
        {
          preferPhenomenon:
            phenomenonRef.current === 'all' ? 'temperature' : phenomenonRef.current,
        },
      )
      if (gen !== viewportGen.current) return
      if (loadSnapshot !== loadGen.current) return
      setMapBoxes(result.boxes)
      setMapFreshIds(result.freshIds)
      setMapRadiusKm(result.radiusKm)
    } catch (error) {
      if (gen !== viewportGen.current) return
      console.error('Viewport load failed', error)
    } finally {
      if (gen === viewportGen.current) setMapLoading(false)
    }
  }, [])

  async function handleSearch(query: string) {
    setStatus('loading')
    setMessage(null)
    try {
      const result = await geocodeCity(query)
      if (!result) {
        setStatus('error')
        setMessage('Ort nicht gefunden. Bitte genauer suchen.')
        return
      }
      await loadAt(result.center, result.label)
    } catch (error) {
      setStatus('error')
      setMessage(formatError(error))
    }
  }

  async function handleLocate() {
    setStatus('loading')
    setMessage(null)
    try {
      const result = await detectUserLocation()
      await loadAt(result.center, result.label)
    } catch (error) {
      setStatus('error')
      setMessage(formatError(error))
    }
  }

  const boxes = snapshot?.boxes ?? []
  const heroFreshIds = useMemo(
    () => (snapshot?.freshBoxes ?? []).map((box) => box._id),
    [snapshot],
  )
  const mapPoints = useMemo(
    () => boxesToGeoJson(mapBoxes, phenomenon, new Set(mapFreshIds)).features.length,
    [mapBoxes, phenomenon, mapFreshIds],
  )

  return (
    <>
      <Hero
        center={center}
        boxes={boxes}
        freshBoxIds={heroFreshIds}
        busy={status === 'loading'}
        onSearch={handleSearch}
        onLocate={handleLocate}
      />

      <section className="section" id="report">
        <h2>Live-Bericht</h2>
        <p className="section-lead">
          Regelbasiert aus Temperatur, Feuchte, Druck und optional Feinstaub — nur frische
          Messungen, keine erfundenen Werte.
        </p>

        {message && (
          <StatusBanner tone={status === 'error' ? 'error' : 'warning'}>{message}</StatusBanner>
        )}
        {status === 'loading' && (
          <StatusBanner>
            Lade Messungen… Stationen werden gefunden und Messwerte nachgeladen.
          </StatusBanner>
        )}
        {snapshot && status !== 'loading' && <WeatherReportView snapshot={snapshot} />}
      </section>

      <section className="section" id="map">
        <h2>Karte & Stationen</h2>
        <p className="section-lead">
          Zahlen an den Messpunkten, darunter die Wärme-/Kältefläche. Beim Verschieben oder Zoomen
          lädt die Karte Stationen für den aktuellen Ausschnitt nach.
        </p>
        <div className="map-panel panel">
          <div className="map-toolbar" role="toolbar" aria-label="Phänomenfilter">
            {(
              [
                ['temperature', 'Temperatur'],
                ['humidity', 'Feuchte'],
                ['pressure', 'Druck'],
                ['pm25', 'PM2.5'],
                ['all', 'Alle'],
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
          {mapLoading && (
            <StatusBanner>
              {`Lade Stationen für den Kartenausschnitt${mapRadiusKm > 0 ? ` (~${Math.round(mapRadiusKm)} km)` : ''}…`}
            </StatusBanner>
          )}
          {!mapLoading && mapRadiusKm > 0 && (
            <p className="legend-note" style={{ margin: '0 0 0.5rem' }}>
              {`Aktueller Laderadius: ~${Math.round(mapRadiusKm)} km (folgt Zoom & Ausschnitt).`}
            </p>
          )}
          <div className="map-stage">
            <SenseMap
              key={snapshot?.generatedAt ?? 'pending'}
              center={center}
              recenterKey={snapshot?.generatedAt}
              boxes={mapBoxes}
              freshBoxIds={mapFreshIds}
              phenomenon={phenomenon}
              selectedBoxId={selectedBoxId}
              onSelectBox={setSelectedBoxId}
              onViewportIdle={handleViewportIdle}
            />
            <MapLegend phenomenon={phenomenon} pointCount={mapPoints || undefined} />
          </div>
          {status === 'ready' && !mapLoading && phenomenon !== 'all' && mapPoints === 0 && (
            <StatusBanner tone="warning">
              Keine Messwerte in diesem Ausschnitt — Ort suchen, Standort nutzen oder weiter zoomen.
            </StatusBanner>
          )}
          <StationList
            boxes={mapBoxes.filter((box) => mapFreshIds.includes(box._id)).slice(0, 40)}
            selectedBoxId={selectedBoxId}
            onSelect={setSelectedBoxId}
          />
          {selectedBoxId && (
            <p>
              <Link to={`/box/${selectedBoxId}`}>Station im Detail öffnen →</Link>
            </p>
          )}
        </div>
      </section>

      <section className="section" id="about">
        <h2>Über die Daten</h2>
        <p className="section-lead">
          openSenseMap ist eine Citizen-Science-Plattform. Diese Demo aggregiert öffentliche
          Messungen und erzeugt daraus einen verständlichen Live-Wetterbericht — als Vorschlag
          für eine innovativere Nutzeroberfläche.
        </p>
      </section>
    </>
  )
}

function formatError(error: unknown): string {
  if (error instanceof ApiError) {
    return `API-Fehler (${error.status}): ${error.message}`
  }
  if (error instanceof Error) return error.message
  return 'Unbekannter Fehler beim Laden der Wetterdaten.'
}
