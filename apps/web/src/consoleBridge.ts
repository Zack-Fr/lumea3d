// Redirect native console methods to centralized logger to control noise.
// We set the original/native console handlers on globalThis immediately so
// the logger can call them without creating a circular import at init time.
type ConsoleFn = (...args: any[]) => void

const __nativeConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
} as any

// Expose native console for the logger to use
(globalThis as any).__nativeConsole = __nativeConsole

// Safe stringify that avoids circular references by falling back per-item
function stringify(args: any[]) {
  return args
    .map(a => {
      if (typeof a === 'string') return a
      try {
        return JSON.stringify(a)
      } catch (e) {
        try {
          return String(a)
        } catch (e2) {
          return '[unserializable]'
        }
      }
    })
    .join(' ')
}

// Dynamically import logger to avoid circular init ordering. Until logger
// loads, the native console remains functional.
import('./utils/logger')
  .then(({ log, once: logOnce }) => {
    // Map console calls to logger levels. Keep nativeConsole available for low-level use.
    console.log = ((...args: any[]) => log('info', stringify(args))) as ConsoleFn
    console.info = ((...args: any[]) => log('info', stringify(args))) as ConsoleFn
    console.warn = ((...args: any[]) => log('warn', stringify(args))) as ConsoleFn
    console.error = ((...args: any[]) => log('error', stringify(args))) as ConsoleFn
    console.debug = ((...args: any[]) => log('debug', stringify(args))) as ConsoleFn

    // expose a one-time console.info via logOnce
    ;(console as any).once = (key: string, ...args: any[]) => logOnce(key, 'info', stringify(args))
  })
  .catch((err) => {
    // If the logger fails to load, keep native console and report the failure.
    __nativeConsole.error('consoleBridge: failed to initialize logger', err)
  })

// NOTE: we don't export the native console to avoid accidental imports/use
