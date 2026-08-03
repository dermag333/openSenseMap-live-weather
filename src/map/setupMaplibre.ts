import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { debug } from '../debug/logger'

let configured = false

/** MapLibre v6 needs an explicit worker URL under Vite or the worker 404s. */
export function setupMaplibreWorker() {
  if (configured) return
  configured = true
  setWorkerUrl(workerUrl)
  debug.info('maplibre', 'Worker URL gesetzt', { workerUrl })
}
