import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@playliberty/tokens/tokens.css';

import { ApiError } from './shared/api/client';
import { attachPlayerPersistence } from './shared/player/playerPersistence';
import { usePlayerStore } from './shared/player/playerStore';
import './shared/styles/base.scss';

import { router } from './router';

attachPlayerPersistence({
  store: usePlayerStore,
  storage: window.localStorage,
  target: window,
  document: window.document
});

/*
 * A client error is the server's answer, not a transient fault: a `404` for a
 * revoked share has to reach the gone state at once rather than after three
 * retries. Only a server error, or a request that never reached the server, is
 * worth trying again.
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
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
