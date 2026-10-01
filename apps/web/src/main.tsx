import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@playliberty/tokens/tokens.css';

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

const queryClient = new QueryClient();
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
