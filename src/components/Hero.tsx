import { LocationSearch } from './LocationSearch'
import type { LonLat } from '../weather/types'

type HeroProps = {
  center: LonLat
  busy?: boolean
  onSearch: (query: string) => void
  onLocate: () => void
}

/** Decorative hero — no second MapLibre instance (avoids duplicate API/viewport load). */
export function Hero({ busy, onSearch, onLocate }: HeroProps) {
  return (
    <section className="hero">
      <div className="hero-map" aria-hidden="true" />
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
