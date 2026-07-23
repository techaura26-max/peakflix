export function registerPeakFlixServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then((registration) => {
        if (registration.waiting) window.dispatchEvent(new Event('peakflix-update-ready'));
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              window.dispatchEvent(new Event('peakflix-update-ready'));
            }
          });
        });
      })
      .catch(() => {
        // PWA support is optional and must never block the website.
      });
  });
}
