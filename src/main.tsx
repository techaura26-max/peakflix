import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { i18nReady } from './i18n';
import { registerPeakFlixServiceWorker } from './pwa';
import './styles.css';

i18nReady.finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </HashRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  );

  registerPeakFlixServiceWorker();
});
