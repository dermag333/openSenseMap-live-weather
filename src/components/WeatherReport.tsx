import type { WeatherSnapshot } from '../weather/types'
import { MetricStrip } from './MetricStrip'

type WeatherReportViewProps = {
  snapshot: WeatherSnapshot
}

export function WeatherReportView({ snapshot }: WeatherReportViewProps) {
  const { report, metrics, quality } = snapshot

  return (
    <article className="panel anim-rise">
      <h2 className="report-headline">{report.headline}</h2>
      <p className="report-summary">{report.summary}</p>
      {report.insights.length > 0 && (
        <ul className="report-insights">
          {report.insights.map((insight) => (
            <li key={insight}>{insight}</li>
          ))}
        </ul>
      )}
      <MetricStrip metrics={metrics} />
      <p className="quality-line">{report.qualityLine}</p>
      {quality.warnings.length > 0 && (
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          Hinweise: {quality.warnings.join(' · ')}
        </p>
      )}
    </article>
  )
}
