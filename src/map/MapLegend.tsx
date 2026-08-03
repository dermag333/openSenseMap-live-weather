import type { CSSProperties } from 'react'
import { PHENOMENON_SCALES } from './colorScales'
import type { PhenomenonKey } from '../weather/types'

type MapLegendProps = {
  phenomenon: PhenomenonKey | 'all'
  pointCount?: number
}

export function MapLegend({ phenomenon, pointCount }: MapLegendProps) {
  const scale = PHENOMENON_SCALES[phenomenon]

  if (phenomenon === 'all') {
    return (
      <div className="map-legend" aria-label="Kartenlegende">
        <strong>Legende</strong>
        <div className="legend-row">
          <span className="legend-swatch" style={{ background: '#1f7a6c' }} />
          Frische Station
        </div>
        <div className="legend-row">
          <span className="legend-swatch" style={{ background: '#8a9aa3' }} />
          Ältere / unklare Station
        </div>
      </div>
    )
  }

  const gradient: CSSProperties = {
    background: `linear-gradient(90deg, ${scale.stops.map(([, color]) => color).join(', ')})`,
  }

  return (
    <div className="map-legend" aria-label={`Legende ${scale.label}`}>
      <strong>
        {scale.label}
        {scale.unit ? ` (${scale.unit})` : ''}
        {typeof pointCount === 'number' ? ` · ${pointCount} Punkte` : ''}
      </strong>
      <div className="legend-gradient" style={gradient}>
        <span>{scale.stops[0][0]}</span>
        <span>{scale.stops[scale.stops.length - 1][0]}</span>
      </div>
      <p className="legend-note">
        Fläche = interpolierte Wärme/Kälte · Zahlen = Messwerte an der Station.
      </p>
    </div>
  )
}
