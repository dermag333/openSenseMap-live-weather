import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBoxes } from '../api/boxes'
import { SenseMap } from '../map/SenseMap'
import { StationList } from '../components/StationList'
import { StatusBanner } from '../components/StatusBanner'
import { filterFreshBoxes } from '../weather/freshness'
import { hydrateBoxes } from '../weather/hydrate'
import type { LonLat, PhenomenonKey } from '../weather/types'
import type { SenseBox } from '../api/types'

const CENTER: LonLat = { lon: 10.0, lat: 51.2 }

export function ExplorePage() {
  const [center, setCenter] = useState<LonLat>(CENTER)
  const [boxes, setBoxes] = useState<SenseBox[]>([])
  const [freshIds, setFreshIds] = useState<string[]>([])
  const [selectedBoxId, setSelectedBoxId] = useState<string>()
  const [phenomenon, setPhenomenon] = useState<PhenomenonKey | 'all'>('all')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchBoxes({
          near: `${center.lon},${center.lat}`,
          maxDistance: 25_000,
        })
        if (cancelled) return
        const fresh = filterFreshBoxes(data, 12, false)
        const hydrated = await hydrateBoxes(fresh, 25)
        const byId = new Map(hydrated.map((b) => [b._id, b]))
        const merged = data.map((b) => byId.get(b._id) ?? b)
        setBoxes(merged)
        setFreshIds(fresh.map((b) => b._id))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [center])

  return (
    <section className="section">
      <h2>Exploration</h2>
      <p className="section-lead">
        Große Kartenansicht mit Phänomenfilter. Klicke eine Station oder springe zurück zum{' '}
        <Link to="/">Live-Wetterbericht</Link>.
      </p>

      {loading && <StatusBanner>Lade senseBoxes…</StatusBanner>}
      {error && <StatusBanner tone="error">{error}</StatusBanner>}

      <div className="map-panel panel">
        <div className="map-toolbar">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setCenter({ lon: 13.4, lat: 52.52 })}
          >
            Berlin
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setCenter({ lon: 9.99, lat: 53.55 })}
          >
            Hamburg
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setCenter({ lon: 11.58, lat: 48.14 })}
          >
            München
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
          center={center}
          boxes={boxes}
          freshBoxIds={freshIds}
          phenomenon={phenomenon}
          selectedBoxId={selectedBoxId}
          onSelectBox={setSelectedBoxId}
          className="sense-map"
        />

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
