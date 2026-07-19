import { logger } from './logger';

type MetricName =
  | 'app_start'
  | 'app_rendered'
  | 'navigation'
  | 'error'
  | 'unhandled_rejection'
  | 'offline'
  | 'online';

interface MetricPayload {
  [key: string]: unknown;
}

export interface TelemetryEvent {
  name: MetricName;
  payload: MetricPayload;
  timestamp: number;
}

const buffer: TelemetryEvent[] = [];
const maxBufferSize = 100;

export function trackMetric(name: MetricName, payload: MetricPayload = {}) {
  const event = { name, payload, timestamp: Date.now() };
  buffer.push(event);
  if (buffer.length > maxBufferSize) buffer.shift();
  logger.info(`metric:${name}`, payload);
}

export function getTelemetrySnapshot() {
  return [...buffer];
}

export function installGlobalTelemetryHandlers() {
  trackMetric('app_start', { path: window.location.pathname });

  window.addEventListener('error', (event) => {
    trackMetric('error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    trackMetric('unhandled_rejection', { reason: String(event.reason) });
  });

  window.addEventListener('offline', () => trackMetric('offline'));
  window.addEventListener('online', () => trackMetric('online'));
}
