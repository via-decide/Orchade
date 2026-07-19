import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { runtimeConfig } from './lib/config';
import { installGlobalTelemetryHandlers, trackMetric } from './lib/telemetry';

installGlobalTelemetryHandlers();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found.');
}

trackMetric('app_rendered', { projectId: runtimeConfig.firebaseProjectId });

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
