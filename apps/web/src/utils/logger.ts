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
  // Use console methods per level
  if (level === 'debug') console.debug(`${prefix}: ${msg}`, ...args);
  else if (level === 'info') console.info(`${prefix}: ${msg}`, ...args);
  else if (level === 'warn') console.warn(`${prefix}: ${msg}`, ...args);
  else console.error(`${prefix}: ${msg}`, ...args);
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
