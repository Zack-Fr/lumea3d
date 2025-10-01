export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const enabledLevels: Record<LogLevel, boolean> = {
  debug: false, // set true during development if needed
  info: true,
  warn: true,
  error: true
};

const onceCache = new Set<string>();

export function log(level: LogLevel, msg: string, ...args: any[]) {
  if (!enabledLevels[level]) return;
  const prefix = level === 'debug' ? 'DEBUG' : level.toUpperCase();
  // Prefer the original native console stored by consoleBridge to avoid recursion
  const nativeConsole = (globalThis as any).__nativeConsole || console;
  if (level === 'debug') nativeConsole.debug?.(`${prefix}: ${msg}`, ...args);
  else if (level === 'info') nativeConsole.info?.(`${prefix}: ${msg}`, ...args);
  else if (level === 'warn') nativeConsole.warn?.(`${prefix}: ${msg}`, ...args);
  else nativeConsole.error?.(`${prefix}: ${msg}`, ...args);
}

export function once(key: string, level: LogLevel, msg: string, ...args: any[]) {
  if (onceCache.has(key)) return;
  onceCache.add(key);
  log(level, msg, ...args);
}

export function enable(level: LogLevel) {
  enabledLevels[level] = true;
}

export function disable(level: LogLevel) {
  enabledLevels[level] = false;
}
