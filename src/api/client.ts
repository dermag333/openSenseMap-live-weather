import { ApiError } from './types'

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

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    const text = await response.text()
    if (!response.ok) {
      throw new ApiError(
        `openSenseMap API ${response.status}: ${path}`,
        response.status,
        text.slice(0, 500),
      )
    }

    if (!text) {
      return undefined as T
    }

    return JSON.parse(text) as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(`Timeout after ${timeoutMs}ms: ${path}`, 408, '')
    }
    throw error
  } finally {
    window.clearTimeout(timer)
  }
}
