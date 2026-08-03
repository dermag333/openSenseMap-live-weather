import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Hero } from '../components/Hero'
import { StatusBanner } from '../components/StatusBanner'
import { WeatherReportView } from '../components/WeatherReport'
import { StationList } from '../components/StationList'
import { MapLegend } from '../map/MapLegend'
import { SenseMap } from '../map/SenseMap'
import { buildWeatherSnapshot } from '../weather/buildWeather'
import { detectUserLocation, geocodeCity } from '../weather/geocode'
import type { LonLat, PhenomenonKey, WeatherSnapshot } from '../weather/types'
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

  const loadAt = useCallback(async (nextCenter: LonLat, label: string) => {
    setStatus('loading')
    setMessage(null)
    setCenter(nextCenter)
    try {
      const next = await buildWeatherSnapshot(nextCenter, label)
      setSnapshot(next)
      setSelectedBoxId(next.freshBoxes[0]?._id)
      setStatus('ready')
      if (next.freshBoxes.length === 0) {
        setMessage('Keine frischen Stationen gefunden. Probiere einen anderen Ort.')
      }
    } catch (error) {
      setStatus('error')
      setMessage(formatError(error))
    }
  }, [])

  useEffect(() => {
    void loadAt(DEFAULT_CENTER, 'Berlin')
  }, [loadAt])

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
  const freshIds = snapshot?.freshBoxes.map((b) => b._id) ?? []

  return (
    <>
      <Hero
        center={center}
        boxes={boxes}
        freshBoxIds={freshIds}
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
          Unter den Messpunkten liegt eine transparente Wärme-/Kältefläche; darüber stehen die
          Zahlen an den Stationen.
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
              boxes={snapshot?.freshBoxes ?? boxes}
              freshBoxIds={freshIds}
              phenomenon={phenomenon}
              selectedBoxId={selectedBoxId}
              onSelectBox={setSelectedBoxId}
            />
            <MapLegend
              phenomenon={phenomenon}
              pointCount={
                phenomenon === 'all'
                  ? undefined
                  : snapshot?.metrics[phenomenon]?.count
              }
            />
          </div>
          <StationList
            boxes={snapshot?.freshBoxes ?? boxes}
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
