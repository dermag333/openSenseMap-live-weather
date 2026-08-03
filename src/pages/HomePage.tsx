import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Hero } from '../components/Hero'
import { StatusBanner } from '../components/StatusBanner'
import { WeatherReportView } from '../components/WeatherReport'
import { StationList } from '../components/StationList'
import { MapLegend } from '../map/MapLegend'
import { SenseMap, type MapViewport } from '../map/SenseMap'
import { boxesToGeoJson } from '../map/markers'
import { bboxKey, radiusKmForViewport } from '../weather/bbox'
import { buildWeatherSnapshot } from '../weather/buildWeather'
import { fetchViewportBoxes } from '../weather/fetchViewportBoxes'
import { detectUserLocation, geocodeCity } from '../weather/geocode'
import type { LonLat, PhenomenonKey, WeatherSnapshot } from '../weather/types'
import type { SenseBox } from '../api/types'
import { ApiError } from '../api/types'
import { debug } from '../debug/logger'

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
  const viewportAbort = useRef<AbortController | null>(null)
  const lastViewportKey = useRef<string | null>(null)
  const statusRef = useRef(status)
  const phenomenonRef = useRef(phenomenon)
  statusRef.current = status
  phenomenonRef.current = phenomenon

  const loadAt = useCallback(async (nextCenter: LonLat, label: string) => {
    viewportAbort.current?.abort()
    viewportGen.current += 1
    const myLoad = ++loadGen.current
    setStatus('loading')
    setMessage(null)
    setCenter(nextCenter)
    setMapLoading(false)
    debug.info('home', 'loadAt start', { nextCenter, label, myLoad })
    try {
      const next = await buildWeatherSnapshot(nextCenter, label)
      if (myLoad !== loadGen.current) {
        debug.warn('home', 'loadAt verworfen (neuer Load)', { myLoad })
        return
      }
      setSnapshot(next)
      setMapBoxes(next.freshBoxes)
      setMapFreshIds(next.freshBoxes.map((box) => box._id))
      setMapRadiusKm(next.quality.radiusKm)
      lastViewportKey.current = null
      setStatus('ready')
      debug.info('home', 'loadAt ready', {
        fresh: next.freshBoxes.length,
        boxes: next.boxes.length,
        radiusKm: next.quality.radiusKm,
      })
      if (next.freshBoxes.length === 0) {
        setMessage('Keine frischen Stationen gefunden. Probiere einen anderen Ort.')
      }
    } catch (error) {
      if (myLoad !== loadGen.current) return
      debug.error('home', 'loadAt failed', error)
      setStatus('error')
      setMessage(formatError(error))
    }
  }, [])

  useEffect(() => {
    void loadAt(DEFAULT_CENTER, 'Berlin')
  }, [loadAt])

  const handleViewportIdle = useCallback(async (viewport: MapViewport) => {
    if (statusRef.current === 'loading') {
      debug.debug('home', 'viewport übersprungen (loadAt läuft)')
      return
    }

    const bbox = {
      west: viewport.southWest.lon,
      south: viewport.southWest.lat,
      east: viewport.northEast.lon,
      north: viewport.northEast.lat,
    }
    const key = bboxKey(bbox)
    if (key === lastViewportKey.current) {
      debug.debug('home', 'viewport übersprungen (gleiche bbox)', { key })
      return
    }

    const radiusKm = radiusKmForViewport(viewport.center, viewport.northEast)
    viewportAbort.current?.abort()
    const controller = new AbortController()
    viewportAbort.current = controller
    const gen = ++viewportGen.current
    const loadSnapshot = loadGen.current

    setMapLoading(true)
    debug.info('home', 'viewport idle → fetch', {
      gen,
      zoom: viewport.zoom,
      center: viewport.center,
      radiusKm,
      bbox: key,
    })

    try {
      const result = await fetchViewportBoxes(
        {
          center: viewport.center,
          bbox,
          radiusKm,
        },
        {
          preferPhenomenon:
            phenomenonRef.current === 'all' ? 'temperature' : phenomenonRef.current,
          signal: controller.signal,
        },
      )
      if (gen !== viewportGen.current) return
      if (loadSnapshot !== loadGen.current) return
      setMapBoxes(result.boxes)
      setMapFreshIds(result.freshIds)
      setMapRadiusKm(result.radiusKm)
      lastViewportKey.current = bboxKey(result.bbox)
      debug.info('home', 'viewport applied', {
        boxes: result.boxes.length,
        radiusKm: result.radiusKm,
      })
    } catch (error) {
      if (gen !== viewportGen.current) return
      if (error instanceof ApiError && error.status === 499) {
        debug.debug('home', 'viewport aborted')
        return
      }
      debug.error('home', 'viewport load failed — behalte bisherige Marker', error)
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

  const mapPoints = useMemo(
    () => boxesToGeoJson(mapBoxes, phenomenon, new Set(mapFreshIds)).features.length,
    [mapBoxes, phenomenon, mapFreshIds],
  )

  return (
    <>
      <Hero
        center={center}
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
          Zahlen an den Messpunkten, darunter die Wärme-/Kältefläche. Verschieben/Zoomen lädt
          Stationen für den sichtbaren Kartenausschnitt nach (wie opensensemap.org per bbox).
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
          <div className="map-stage">
            <SenseMap
              center={center}
              recenterKey={snapshot?.generatedAt}
              boxes={mapBoxes}
              freshBoxIds={mapFreshIds}
              phenomenon={phenomenon}
              selectedBoxId={selectedBoxId}
              onSelectBox={setSelectedBoxId}
              onViewportIdle={handleViewportIdle}
              loading={mapLoading || status === 'loading'}
              loadRadiusKm={mapRadiusKm || undefined}
            />
            <MapLegend phenomenon={phenomenon} pointCount={mapPoints || undefined} />
          </div>
          {status === 'ready' && !mapLoading && phenomenon !== 'all' && mapPoints === 0 && (
            <StatusBanner tone="warning">
              Keine Messwerte in diesem Ausschnitt — Ort suchen, Standort nutzen oder näher zoomen.
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
    if (error.status === 408) {
      return 'Die openSenseMap-API antwortet gerade sehr langsam. Bitte kurz warten und erneut versuchen.'
    }
    return `API-Fehler (${error.status}): ${error.message}`
  }
  if (error instanceof Error) return error.message
  return 'Unbekannter Fehler beim Laden der Wetterdaten.'
}
