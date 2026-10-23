import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';

import { EgressStatus, ProblemCode, endpoints } from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import {
  mockUrl,
  problemResponse,
  respond
} from '../../../testing/mocks/handlers';
import { server } from '../../../testing/mocks/server';
import EgressPage from './EgressPage';

const TWO_HOURS_AGO = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

const READ = {
  agentReachable: true,
  configs: [
    {
      name: '01-fr',
      endpoint: '185.0.0.1:51820',
      status: EgressStatus.Ok,
      active: true,
      lastAttemptAt: TWO_HOURS_AGO,
      lastProbeAt: null,
      lastError: null
    },
    {
      name: '02-ch',
      endpoint: null,
      status: EgressStatus.Unknown,
      active: false,
      lastAttemptAt: null,
      lastProbeAt: null,
      lastError: null
    }
  ]
};

function renderPage() {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <p>library</p>
  });
  const egressRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/egress',
    component: EgressPage
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, egressRoute]),
    history: createMemoryHistory({ initialEntries: ['/egress'] })
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider preferred={['en']}>
        <RouterProvider router={router} />
      </I18nProvider>
    </QueryClientProvider>
  );
}

describe('the egress page', () => {
  it('draws the pool with its endpoint, state, last attempt and active row', async () => {
    server.use(
      http.get(mockUrl(endpoints.egress), () => respond(endpoints.egress, READ))
    );

    renderPage();

    expect(
      await screen.findByRole('table', { name: 'VPN settings' })
    ).toBeInTheDocument();
    expect(screen.getByText('01-fr')).toBeInTheDocument();
    expect(screen.getByText('185.0.0.1:51820')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'OK' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Unknown' })).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.getByText('Egress agent reachable.')).toBeInTheDocument();
  });

  it('says the agent is unreachable while still drawing the last known pool', async () => {
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        respond(endpoints.egress, { ...READ, agentReachable: false })
      )
    );

    renderPage();

    expect(
      await screen.findByText(/Egress agent unreachable/)
    ).toBeInTheDocument();
    expect(screen.getByText('01-fr')).toBeInTheDocument();
  });

  it('answers a non-admin with the unavailable sentence and no pool', async () => {
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        problemResponse({
          code: ProblemCode.NotFound,
          status: 404,
          title: 'Not Found'
        })
      )
    );

    renderPage();

    expect(
      await screen.findByText('This page is not available.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('offers a retry when the read fails for another reason', async () => {
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        problemResponse({
          code: ProblemCode.InternalError,
          status: 500,
          title: 'Internal Server Error'
        })
      )
    );

    renderPage();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
  });
});
