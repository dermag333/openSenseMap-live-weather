import { fetchBoxes } from '../api/boxes'
import { aggregateMetrics } from './aggregate'
import { bboxFromCenter } from './bbox'
import { filterFreshBoxes } from './freshness'
import { hydrateBoxes } from './hydrate'
import { generateReport } from './report'
import type { LonLat, WeatherOptions, WeatherQuality, WeatherSnapshot } from './types'

const DEFAULTS = {
  radiusKm: 10,
  freshnessHours: 6,
  preferOutdoor: true,
  minStations: 2,
  hydrateLimit: 35,
}

export async function buildWeatherSnapshot(
  center: LonLat,
  locationLabel: string,
  options: WeatherOptions = {},
): Promise<WeatherSnapshot> {
  let radiusKm = options.radiusKm ?? DEFAULTS.radiusKm
  const freshnessHours = options.freshnessHours ?? DEFAULTS.freshnessHours
  const preferOutdoor = options.preferOutdoor ?? DEFAULTS.preferOutdoor
  const minStations = options.minStations ?? DEFAULTS.minStations
  const warnings: string[] = []

  let boxes = await fetchNearbyBoxes(center, radiusKm)
  let freshBoxes = filterFreshBoxes(boxes, freshnessHours, preferOutdoor)

  if (freshBoxes.length < minStations) {
    radiusKm = Math.round(radiusKm * 1.8)
    boxes = await fetchNearbyBoxes(center, radiusKm)
    freshBoxes = filterFreshBoxes(boxes, freshnessHours, preferOutdoor)
    warnings.push(
      'Zu wenige frische Stationen im ersten Radius — Suche automatisch erweitert.',
    )
  }

  const outdoorCount = freshBoxes.filter(
    (b) => (b.exposure || '').toLowerCase() === 'outdoor',
  ).length

  if (preferOutdoor && outdoorCount < minStations && freshBoxes.length > outdoorCount) {
    warnings.push(
      'Wenig ausgewiesene Outdoor-Stationen — Indoor/unknown-Messungen wurden mit einbezogen.',
    )
  }

  if (freshBoxes.length === 0) {
    warnings.push('Keine frischen Messungen im Zeitraum gefunden.')
  }

  // Sort freshest first, then hydrate — list payloads omit measurement values.
  const rankedFresh = [...freshBoxes].sort((a, b) => {
    const aTime = a.lastMeasurementAt ? Date.parse(a.lastMeasurementAt) : 0
    const bTime = b.lastMeasurementAt ? Date.parse(b.lastMeasurementAt) : 0
    return bTime - aTime
  })

  const hydratedFresh = await hydrateBoxes(rankedFresh, DEFAULTS.hydrateLimit)
  const metrics = aggregateMetrics(hydratedFresh)

  if (!metrics.temperature && hydratedFresh.length > 0) {
    warnings.push(
      'Frische Stationen gefunden, aber keine plausiblen Temperaturwerte nach Qualitätsfilter.',
    )
  }

  const timestamps = hydratedFresh
    .map((b) => b.lastMeasurementAt)
    .filter((v): v is string => Boolean(v))
    .sort()

  const bbox = bboxFromCenter(center, radiusKm)
  const quality: WeatherQuality = {
    stationCount: boxes.length,
    freshStationCount: freshBoxes.length,
    radiusKm,
    freshnessHours,
    oldestFreshAt: timestamps[0],
    newestFreshAt: timestamps[timestamps.length - 1],
    warnings,
  }

  const report = generateReport(locationLabel, metrics, quality)

  // Prefer hydrated copies on the map when available.
  const hydratedById = new Map(hydratedFresh.map((b) => [b._id, b]))
  const mapBoxes = boxes.map((b) => hydratedById.get(b._id) ?? b)

  return {
    locationLabel,
    center,
    bbox,
    metrics,
    boxes: mapBoxes,
    freshBoxes: hydratedFresh,
    quality,
    report,
    generatedAt: new Date().toISOString(),
  }
}

async function fetchNearbyBoxes(center: LonLat, radiusKm: number) {
  return fetchBoxes({
    near: `${center.lon},${center.lat}`,
    maxDistance: Math.round(radiusKm * 1000),
  })
}
