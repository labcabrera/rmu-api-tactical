import type { LogLevel } from '@nestjs/common';

const LEVELS: LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];
const ALIASES: Record<string, LogLevel> = { info: 'log' };

/** Maps LOG_LEVEL (error, warn, info, debug, verbose) to the Nest log levels it enables. */
export function configureLogger(rawLevel = 'info'): LogLevel[] {
  const name = rawLevel.toLowerCase();
  const level = ALIASES[name] ?? (LEVELS.includes(name as LogLevel) ? (name as LogLevel) : 'log');
  return LEVELS.slice(0, LEVELS.indexOf(level) + 1);
}
