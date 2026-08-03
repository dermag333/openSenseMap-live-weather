import { extractSamples, phenomenonLabel, type TaggedSample } from './phenomena'
import type { SenseBox } from '../api/types'
import type { AggregatedMetric, PhenomenonKey, PhenomenonSample } from './types'

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function dedupeByBox(samples: TaggedSample[]): TaggedSample[] {
  const byBox = new Map<string, TaggedSample>()
  for (const sample of samples) {
    const existing = byBox.get(sample.boxId)
    if (!existing || Date.parse(sample.measuredAt) > Date.parse(existing.measuredAt)) {
      byBox.set(sample.boxId, sample)
    }
  }
  return [...byBox.values()]
}

export function aggregateMetric(
  key: PhenomenonKey,
  samples: PhenomenonSample[],
): AggregatedMetric | undefined {
  const unique = dedupeByBox(samples as TaggedSample[])
  if (unique.length === 0) return undefined

  const values = unique.map((s) => s.value).sort((a, b) => a - b)
  return {
    key,
    label: phenomenonLabel(key),
    unit: unique[0].unit,
    median: median(values),
    mean: mean(values),
    min: values[0],
    max: values[values.length - 1],
    count: unique.length,
    samples: unique,
  }
}

export function aggregateMetrics(
  boxes: SenseBox[],
): Partial<Record<PhenomenonKey, AggregatedMetric>> {
  const all = extractSamples(boxes)
  const grouped = new Map<PhenomenonKey, TaggedSample[]>()

  for (const sample of all) {
    const list = grouped.get(sample.key) ?? []
    list.push(sample)
    grouped.set(sample.key, list)
  }

  const result: Partial<Record<PhenomenonKey, AggregatedMetric>> = {}
  for (const [key, samples] of grouped) {
    const metric = aggregateMetric(key, samples)
    if (metric) result[key] = metric
  }
  return result
}
