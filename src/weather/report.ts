import type { AggregatedMetric, WeatherQuality, WeatherReport } from './types'

function formatValue(metric: AggregatedMetric, digits = 1): string {
  return `${metric.median.toFixed(digits)} ${metric.unit}`
}

function tempPhrase(temp: number): string {
  if (temp < 0) return 'frostig kalt'
  if (temp < 8) return 'kühl'
  if (temp < 16) return 'mild'
  if (temp < 24) return 'angenehm warm'
  if (temp < 30) return 'warm'
  return 'heiß'
}

function humidityPhrase(humidity: number): string {
  if (humidity < 35) return 'trockene Luft'
  if (humidity < 55) return 'ausgeglichene Luftfeuchtigkeit'
  if (humidity < 75) return 'eher feuchte Luft'
  return 'sehr feuchte Luft'
}

function pressurePhrase(pressure: number): string {
  if (pressure < 1000) return 'eher tiefer Luftdruck'
  if (pressure > 1025) return 'eher hoher Luftdruck'
  return 'neutraler Luftdruck'
}

function airQualityInsight(pm25?: AggregatedMetric, pm10?: AggregatedMetric): string | undefined {
  const value = pm25?.median ?? pm10?.median
  if (value === undefined) return undefined
  const label = pm25 ? 'PM2.5' : 'PM10'
  if (value <= 10) return `${label} liegt mit ${value.toFixed(1)} µg/m³ im niedrigen Bereich.`
  if (value <= 25) return `${label} liegt mit ${value.toFixed(1)} µg/m³ im moderaten Bereich.`
  return `${label} ist mit ${value.toFixed(1)} µg/m³ erhöht — lokale Quellen können eine Rolle spielen.`
}

export function generateReport(
  locationLabel: string,
  metrics: Partial<Record<string, AggregatedMetric>>,
  quality: WeatherQuality,
): WeatherReport {
  const temp = metrics.temperature
  const humidity = metrics.humidity
  const pressure = metrics.pressure
  const insights: string[] = []

  if (!temp) {
    return {
      headline: `Kein frischer Temperaturwert für ${locationLabel}`,
      summary:
        'In der gewählten Umgebung liefern derzeit zu wenige senseBoxes frische Temperaturdaten. Vergrößere den Radius oder prüfe die Karte auf aktive Stationen.',
      insights: quality.warnings,
      qualityLine: qualityLine(quality),
    }
  }

  const feel = tempPhrase(temp.median)
  const headline = `${locationLabel}: ${feel} bei ${formatValue(temp)}`
  const parts = [
    `Die Citizen-Science-Messungen zeigen aktuell etwa ${formatValue(temp)}`,
  ]

  if (humidity) {
    parts.push(`bei ${humidityPhrase(humidity.median)} (${formatValue(humidity, 0)})`)
  }
  if (pressure) {
    parts.push(`und ${pressurePhrase(pressure.median)} (${formatValue(pressure, 0)})`)
  }

  const summary = `${parts.join(', ')}.`

  if (temp.count >= 2) {
    insights.push(
      `Temperaturspanne vor Ort: ${temp.min.toFixed(1)}–${temp.max.toFixed(1)} ${temp.unit} über ${temp.count} Stationen.`,
    )
  }

  if (humidity) {
    insights.push(`Relative Feuchte im Median: ${formatValue(humidity, 0)}.`)
  }

  if (pressure) {
    insights.push(`Luftdruck im Median: ${formatValue(pressure, 0)}.`)
  }

  const aq = airQualityInsight(metrics.pm25, metrics.pm10)
  if (aq) insights.push(aq)

  for (const warning of quality.warnings) {
    if (!insights.includes(warning)) insights.push(warning)
  }

  return {
    headline,
    summary,
    insights,
    qualityLine: qualityLine(quality),
  }
}

function qualityLine(quality: WeatherQuality): string {
  const newest = quality.newestFreshAt
    ? new Date(quality.newestFreshAt).toLocaleString('de-DE')
    : 'unbekannt'
  return `Basiert auf ${quality.freshStationCount} frischen Stationen im Radius von ${quality.radiusKm} km (Fenster ${quality.freshnessHours} h). Neuester Messpunkt: ${newest}.`
}
