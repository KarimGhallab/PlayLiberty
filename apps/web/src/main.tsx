import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { I18nProvider } from '@playliberty/i18n';
import '@playliberty/tokens/tokens.css';

import { queryClient } from './shared/api/queryClient';
import DeferredToasts from './shared/components/UndoToast/DeferredToasts';
import { attachPlayerPersistence } from './shared/player/playerPersistence/playerPersistence';
import { usePlayerStore } from './shared/player/playerStore/playerStore';
import './shared/styles/base.scss';

import { router } from './router';

attachPlayerPersistence({
  store: usePlayerStore,
  storage: window.sessionStorage,
  target: window,
  document: window.document
});

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('The root element is missing from index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <RouterProvider router={router} />
        <DeferredToasts />
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>
);
