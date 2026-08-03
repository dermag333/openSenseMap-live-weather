import { SenseMap } from '../map/SenseMap'
import { LocationSearch } from './LocationSearch'
import type { LonLat } from '../weather/types'
import type { SenseBox } from '../api/types'

type HeroProps = {
  center: LonLat
  boxes: SenseBox[]
  freshBoxIds: string[]
  busy?: boolean
  onSearch: (query: string) => void
  onLocate: () => void
}

export function Hero({
  center,
  boxes,
  freshBoxIds,
  busy,
  onSearch,
  onLocate,
}: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-map" aria-hidden="true">
        <SenseMap
          center={center}
          boxes={boxes}
          freshBoxIds={freshBoxIds}
          phenomenon="all"
        />
      </div>
      <div className="hero-veil" />
      <div className="hero-content">
        <h1 className="hero-brand anim-rise">
          openSenseMap <em>Live</em>
        </h1>
        <p className="hero-lead anim-rise-delay">
          Live-Wetterbericht aus echten Citizen-Science-Sensoren — aggregiert aus der
          openSenseMap API, nicht aus einem klassischen Wetterdienst.
        </p>
        <LocationSearch onSearch={onSearch} onLocate={onLocate} busy={busy} />
      </div>
    </section>
  )
}
