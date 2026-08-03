import { apiGet, API_BASE } from './client'
import type { PlatformStats } from './types'

export async function fetchPlatformStats(): Promise<{
  boxes: number
  measurements: number
  senseBoxes: number
}> {
  const [boxes, measurements, senseBoxes] = await apiGet<PlatformStats>('/stats')
  return { boxes, measurements, senseBoxes }
}

export async function fetchApiHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const stats = await fetchPlatformStats()
    return {
      ok: true,
      detail: `${API_BASE} · ${stats.boxes} boxes · ${stats.measurements} measurements`,
    }
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : 'unknown error',
    }
  }
}
