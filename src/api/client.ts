import { ApiError } from './types'
import { debug } from '../debug/logger'

export const API_BASE =
  import.meta.env.VITE_OSEM_API_URL?.replace(/\/$/, '') ||
  'https://api.opensensemap.org'

const DEFAULT_TIMEOUT_MS = 45_000

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const url = new URL(path.startsWith('http') ? path : `${API_BASE}${path}`)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }

  const started = performance.now()
  debug.debug('api', 'GET start', { url: url.toString() })

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    const text = await response.text()
    if (!response.ok) {
      debug.error('api', 'GET failed', {
        status: response.status,
        path,
        body: text.slice(0, 200),
      })
      throw new ApiError(
        `openSenseMap API ${response.status}: ${path}`,
        response.status,
        text.slice(0, 500),
      )
    }

    if (!text) {
      debug.warn('api', 'GET empty body', {
        path,
        ms: Math.round(performance.now() - started),
      })
      return undefined as T
    }

    const data = JSON.parse(text) as T
    const count = Array.isArray(data) ? data.length : 1
    debug.info('api', 'GET ok', {
      path,
      count,
      ms: Math.round(performance.now() - started),
      bytes: text.length,
    })
    return data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      debug.error('api', 'GET timeout', { path, timeoutMs })
      throw new ApiError(`Timeout after ${timeoutMs}ms: ${path}`, 408, '')
    }
    debug.error('api', 'GET exception', error)
    throw error
  } finally {
    window.clearTimeout(timer)
  }
}
