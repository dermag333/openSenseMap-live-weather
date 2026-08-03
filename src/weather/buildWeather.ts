import { fetchBoxes } from '../api/boxes'
import { aggregateMetrics } from './aggregate'
import { bboxFromCenter, bboxToQuery, expandBBox } from './bbox'
import { filterFreshBoxes } from './freshness'
import { generateReport } from './report'
import type { LonLat, WeatherOptions, WeatherQuality, WeatherSnapshot } from './types'

const DEFAULTS = {
  radiusKm: 12,
  freshnessHours: 6,
  preferOutdoor: true,
  minStations: 2,
}

export async function buildWeatherSnapshot(
  center: LonLat,
  locationLabel: string,
  options: WeatherOptions = {},
): Promise<WeatherSnapshot> {
  const radiusKm = options.radiusKm ?? DEFAULTS.radiusKm
  const freshnessHours = options.freshnessHours ?? DEFAULTS.freshnessHours
  const preferOutdoor = options.preferOutdoor ?? DEFAULTS.preferOutdoor
  const minStations = options.minStations ?? DEFAULTS.minStations

  let bbox = bboxFromCenter(center, radiusKm)
  let boxes = await fetchBoxes({ bbox: bboxToQuery(bbox) })
  let freshBoxes = filterFreshBoxes(boxes, freshnessHours, preferOutdoor)

  const warnings: string[] = []

  if (freshBoxes.length < minStations) {
    bbox = expandBBox(bbox, 1.8)
    boxes = await fetchBoxes({ bbox: bboxToQuery(bbox) })
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

  const metrics = aggregateMetrics(freshBoxes)
  const timestamps = freshBoxes
    .map((b) => b.lastMeasurementAt)
    .filter((v): v is string => Boolean(v))
    .sort()

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

  return {
    locationLabel,
    center,
    bbox,
    metrics,
    boxes,
    freshBoxes,
    quality,
    report,
    generatedAt: new Date().toISOString(),
  }
}
