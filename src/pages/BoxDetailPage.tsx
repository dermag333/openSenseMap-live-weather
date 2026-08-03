import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchBox, fetchSensorData } from '../api/boxes'
import type { SenseBox } from '../api/types'
import { StatusBanner } from '../components/StatusBanner'
import { classifySensor } from '../weather/phenomena'

type HistoryPreview = {
  sensorId: string
  title: string
  points: number
  latest?: string
}

export function BoxDetailPage() {
  const { boxId = '' } = useParams()
  const [box, setBox] = useState<SenseBox | null>(null)
  const [history, setHistory] = useState<HistoryPreview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchBox(boxId)
        if (cancelled) return
        setBox(data)

        const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const previews: HistoryPreview[] = []

        for (const sensor of (data.sensors ?? []).slice(0, 4)) {
          try {
            const points = await fetchSensorData(boxId, sensor._id, fromDate)
            previews.push({
              sensorId: sensor._id,
              title: sensor.title,
              points: points.length,
              latest: points[0]?.value ?? sensor.lastMeasurement?.value,
            })
          } catch {
            previews.push({
              sensorId: sensor._id,
              title: sensor.title,
              points: 0,
              latest: sensor.lastMeasurement?.value,
            })
          }
        }

        if (!cancelled) setHistory(previews)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Box konnte nicht geladen werden')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (boxId) void load()
    return () => {
      cancelled = true
    }
  }, [boxId])

  return (
    <section className="section">
      <p>
        <Link to="/">← Zurück zum Wetterbericht</Link>
      </p>
      {loading && <StatusBanner>Lade Station…</StatusBanner>}
      {error && <StatusBanner tone="error">{error}</StatusBanner>}

      {box && (
        <div className="panel box-grid anim-rise">
          <div>
            <h2>{box.name}</h2>
            <p className="section-lead">
              Exposure: {(box.exposure || 'unknown').toLowerCase()}
              {box.lastMeasurementAt
                ? ` · zuletzt ${new Date(box.lastMeasurementAt).toLocaleString('de-DE')}`
                : ''}
            </p>
            {box.currentLocation?.coordinates && (
              <p className="muted">
                Position: {box.currentLocation.coordinates[1].toFixed(4)},{' '}
                {box.currentLocation.coordinates[0].toFixed(4)}
              </p>
            )}
          </div>

          <div>
            <h3>Aktuelle Sensoren</h3>
            {(box.sensors ?? []).map((sensor) => {
              const kind = classifySensor(sensor)?.label
              return (
                <div className="sensor-row" key={sensor._id}>
                  <div>
                    <strong>{sensor.title}</strong>
                    <div className="station-meta">
                      {kind ?? sensor.sensorType ?? 'Sensor'} · {sensor.unit}
                    </div>
                  </div>
                  <div>
                    {sensor.lastMeasurement?.value ?? '—'} {sensor.unit}
                  </div>
                </div>
              )
            })}
          </div>

          <div>
            <h3>Verlauf (24h, Stichprobe)</h3>
            {history.length === 0 && (
              <p className="muted">Noch keine Verlaufsdaten geladen.</p>
            )}
            {history.map((item) => (
              <div className="sensor-row" key={item.sensorId}>
                <div>
                  <strong>{item.title}</strong>
                  <div className="station-meta">{item.points} Punkte in 24h</div>
                </div>
                <div>{item.latest ?? '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
