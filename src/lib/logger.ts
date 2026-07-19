type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const shouldDebug = import.meta.env.DEV;

function write(level: LogLevel, message: string, context: LogContext = {}) {
  const payload = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  if (level === 'debug' && !shouldDebug) return;

  const target = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  target(`[orchade:${level}] ${message}`, payload);
}

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
};
