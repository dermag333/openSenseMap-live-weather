import type { AggregatedMetric, PhenomenonKey } from '../weather/types'

const ORDER: PhenomenonKey[] = [
  'temperature',
  'humidity',
  'pressure',
  'pm25',
  'pm10',
  'illuminance',
]

type MetricStripProps = {
  metrics: Partial<Record<PhenomenonKey, AggregatedMetric>>
}

export function MetricStrip({ metrics }: MetricStripProps) {
  const items = ORDER.map((key) => metrics[key]).filter(
    (metric): metric is AggregatedMetric => Boolean(metric),
  )

  if (items.length === 0) {
    return (
      <p className="muted" style={{ marginTop: '1rem' }}>
        Keine auswertbaren Messwerte in dieser Region.
      </p>
    )
  }

  return (
    <div className="metric-strip anim-rise-delay">
      {items.map((metric) => (
        <div className="metric-card" key={metric.key}>
          <span>{metric.label}</span>
          <strong>
            {metric.median.toFixed(metric.key === 'humidity' || metric.key === 'pressure' ? 0 : 1)}{' '}
            {metric.unit}
          </strong>
          <span>
            {metric.count} Stationen · {metric.min.toFixed(1)}–{metric.max.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  )
}
