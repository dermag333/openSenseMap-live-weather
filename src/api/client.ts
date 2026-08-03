import { ApiError } from './types'
import { debug } from '../debug/logger'

export const API_BASE =
  import.meta.env.VITE_OSEM_API_URL?.replace(/\/$/, '') ||
  'https://api.opensensemap.org'

const DEFAULT_TIMEOUT_MS = 45_000
const BOXES_LIST_TIMEOUT_MS = 90_000

/** Serialize heavy /boxes list calls — parallel near-queries starve each other. */
let boxesListChain: Promise<unknown> = Promise.resolve()

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  options: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<T> {
  const isBoxesList = path === '/boxes'
  const timeoutMs =
    options.timeoutMs ?? (isBoxesList ? BOXES_LIST_TIMEOUT_MS : DEFAULT_TIMEOUT_MS)

  const run = () => apiGetOnce<T>(path, params, timeoutMs, options.signal)
  if (!isBoxesList) return run()

  const next = boxesListChain.then(run, run)
  // Keep the queue alive even if a request fails.
  boxesListChain = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

async function apiGetOnce<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> | undefined,
  timeoutMs: number,
  outerSignal?: AbortSignal,
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

  if (outerSignal?.aborted) {
    throw new ApiError(`Aborted: ${path}`, 499, '')
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  const onOuterAbort = () => controller.abort()
  outerSignal?.addEventListener('abort', onOuterAbort)

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
    if (outerSignal?.aborted) {
      debug.warn('api', 'GET aborted', { path })
      throw new ApiError(`Aborted: ${path}`, 499, '')
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      debug.error('api', 'GET timeout', { path, timeoutMs })
      throw new ApiError(`Timeout after ${timeoutMs}ms: ${path}`, 408, '')
    }
    debug.error('api', 'GET exception', error)
    throw error
  } finally {
    window.clearTimeout(timer)
    outerSignal?.removeEventListener('abort', onOuterAbort)
  }
}
