import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { I18nProvider } from '@playliberty/i18n';
import '@playliberty/tokens/tokens.css';

import { ApiError } from './shared/api/client/client';
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

/*
 * A 4xx is the server's answer, not a transient fault: a revoked share's `404`
 * must reach the gone state at once. Only a 5xx or an unreached server retries.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status < 500) && failureCount < 3
    }
  }
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
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>
);
