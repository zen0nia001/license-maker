import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ControlProvider } from './state/control';
import { SigningProvider, unlockedNow } from './state/signing';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SigningProvider>
      <ControlProvider>
        <App />
      </ControlProvider>
    </SigningProvider>
  </React.StrictMode>,
);

// Offline use and notifications (sw.js, made from app/sw-template.js by the build). A new version took over
// (downloaded in the background): show it at once, unless the signing key is unlocked (reloading would lock it);
// then it shows from the next start. Not in development (the dev server's files change all the time).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadOne = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadOne && !reloaded && !unlockedNow.current) {
      reloaded = true;
      location.reload();
    }
  });
  navigator.serviceWorker
    .register('sw.js', { updateViaCache: 'none' })
    .then((reg) => reg.update())
    .catch(() => {
      /* online-only then */
    });
}
