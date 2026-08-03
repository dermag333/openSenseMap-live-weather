type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const PREFIX = '[osem]'

function emit(level: LogLevel, scope: string, message: string, data?: unknown) {
  const label = `${PREFIX} ${scope}: ${message}`
  if (data === undefined) {
    console[level](label)
    return
  }
  console[level](label, data)
}

/** Structured console logs for map/API debugging (always on in this demo). */
export const debug = {
  debug: (scope: string, message: string, data?: unknown) =>
    emit('debug', scope, message, data),
  info: (scope: string, message: string, data?: unknown) =>
    emit('info', scope, message, data),
  warn: (scope: string, message: string, data?: unknown) =>
    emit('warn', scope, message, data),
  error: (scope: string, message: string, data?: unknown) =>
    emit('error', scope, message, data),
}
