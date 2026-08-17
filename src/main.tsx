import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

// Forcefully unregister any existing service workers to fix cache corruption
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}

// Still call this so the self-destroying SW gets registered and cleans up caches
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
