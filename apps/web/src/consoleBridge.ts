// Redirect native console methods to centralized logger to control noise.
import { log, once as logOnce } from './utils/logger'

type ConsoleFn = (...args: any[]) => void

const nativeConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
}

// Map console calls to logger levels. Keep nativeConsole available for low-level use.
console.log = ((...args: any[]) => log('info', stringify(args))) as ConsoleFn
console.info = ((...args: any[]) => log('info', stringify(args))) as ConsoleFn
console.warn = ((...args: any[]) => log('warn', stringify(args))) as ConsoleFn
console.error = ((...args: any[]) => log('error', stringify(args))) as ConsoleFn
console.debug = ((...args: any[]) => log('debug', stringify(args))) as ConsoleFn

// expose a one-time console.info via logOnce
(console as any).once = (key: string, ...args: any[]) => logOnce(key, 'info', stringify(args))

function stringify(args: any[]) {
  try {
    return args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
  } catch (e) {
    return args.map(String).join(' ')
  }
}

export { nativeConsole }
