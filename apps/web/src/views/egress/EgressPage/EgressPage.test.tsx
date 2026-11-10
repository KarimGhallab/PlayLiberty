import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
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
import { stubViewport } from '../../../testing/viewport';
import EgressPage, { CARD_QUERY } from './EgressPage';

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
      lastCheckAt: null,
      lastExitIp: null,
      lastError: null
    },
    {
      name: '02-ch',
      endpoint: null,
      status: EgressStatus.Unknown,
      active: false,
      lastAttemptAt: null,
      lastCheckAt: null,
      lastExitIp: null,
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

function activeRow(name: string): HTMLElement {
  return screen.getByText(name).closest('tr') as HTMLElement;
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
    expect(screen.getByText('No attempt yet')).toBeInTheDocument();
    expect(screen.getAllByText('Not checked yet')[0]).toBeInTheDocument();
    expect(screen.getByText('Egress agent reachable.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'France' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Switzerland' })
    ).toBeInTheDocument();
  });

  it('gives every exit its own card when the table does not fit', async () => {
    server.use(
      http.get(mockUrl(endpoints.egress), () => respond(endpoints.egress, READ))
    );
    const restore = stubViewport(CARD_QUERY);

    try {
      renderPage();

      expect(
        await screen.findByRole('list', { name: 'VPN settings' })
      ).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();

      const [first, second] = screen.getAllByRole('listitem');
      expect(within(first).getByText('01-fr')).toBeInTheDocument();
      expect(within(first).getByText('Exit endpoint')).toBeInTheDocument();
      expect(within(first).getByText('185.0.0.1:51820')).toBeInTheDocument();
      expect(within(first).getByText('OK')).toBeInTheDocument();
      expect(within(first).getByText('Active')).toBeInTheDocument();
      expect(within(first).getByText('2 hours ago')).toBeInTheDocument();
      expect(
        within(first).getByRole('button', { name: 'Check' })
      ).toBeInTheDocument();
      expect(
        within(second).getByRole('button', { name: 'Switch' })
      ).toBeInTheDocument();
    } finally {
      restore();
    }
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

  it('answers a non-admin with the page-level not-found', async () => {
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
      await screen.findByRole('heading', { name: 'Page not found' })
    ).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'VPN settings' })).toBeNull();
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

describe('the one action per row', () => {
  it('checks the active row and draws the measured address', async () => {
    const checked = {
      ...READ,
      configs: [
        {
          ...READ.configs[0],
          status: EgressStatus.Ok,
          lastCheckAt: new Date().toISOString(),
          lastExitIp: '185.0.0.9'
        },
        READ.configs[1]
      ]
    };
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        respond(endpoints.egress, READ)
      ),
      http.post(mockUrl(endpoints.checkEgress), () =>
        respond(endpoints.checkEgress, checked)
      )
    );

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Check' }));

    expect(
      await screen.findByText('Provider saw 185.0.0.9')
    ).toBeInTheDocument();
    expect(within(activeRow('01-fr')).getByText('Active')).toBeInTheDocument();
    expect(
      within(activeRow('01-fr')).getByRole('button', { name: 'Check' })
    ).toBeInTheDocument();
  });

  it('switches an inactive row and moves the marker', async () => {
    const switched = {
      ...READ,
      configs: [
        { ...READ.configs[0], active: false },
        { ...READ.configs[1], active: true }
      ]
    };
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        respond(endpoints.egress, READ)
      ),
      http.post(mockUrl(endpoints.switchEgress, { name: '02-ch' }), () =>
        respond(endpoints.switchEgress, switched)
      )
    );

    renderPage();

    const switches = await screen.findAllByRole('button', { name: 'Switch' });
    expect(switches).toHaveLength(1);
    fireEvent.click(switches[0]);

    await waitFor(() =>
      expect(within(activeRow('02-ch')).getByText('Active')).toBeInTheDocument()
    );
    expect(
      within(activeRow('02-ch')).getByRole('button', { name: 'Check' })
    ).toBeInTheDocument();
    expect(
      within(activeRow('01-fr')).getByRole('button', { name: 'Switch' })
    ).toBeInTheDocument();
  });

  it('says why a refused switch left the active row alone', async () => {
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        respond(endpoints.egress, READ)
      ),
      http.post(mockUrl(endpoints.switchEgress, { name: '02-ch' }), () =>
        problemResponse({
          code: ProblemCode.EgressSwitchFailed,
          status: 502,
          title: 'Switch Failed',
          detail: 'No WireGuard interface is configured.'
        })
      )
    );

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Switch' }));

    expect(
      await screen.findByText('No WireGuard interface is configured.')
    ).toBeInTheDocument();
    expect(within(activeRow('01-fr')).getByText('Active')).toBeInTheDocument();
  });

  it('reports an unreachable agent without moving the marker', async () => {
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        respond(endpoints.egress, READ)
      ),
      http.post(mockUrl(endpoints.switchEgress, { name: '02-ch' }), () =>
        respond(endpoints.switchEgress, {
          ...READ,
          agentReachable: false
        })
      )
    );

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Switch' }));

    expect(
      await screen.findByText('The egress agent could not be reached.')
    ).toBeInTheDocument();
    expect(within(activeRow('01-fr')).getByText('Active')).toBeInTheDocument();
  });

  it('cannot be pressed twice while the operation is in flight', async () => {
    const switched = {
      ...READ,
      configs: [
        { ...READ.configs[0], active: false },
        { ...READ.configs[1], active: true }
      ]
    };
    let release: (() => void) | undefined;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        respond(endpoints.egress, READ)
      ),
      http.post(
        mockUrl(endpoints.switchEgress, { name: '02-ch' }),
        async () => {
          await gate;

          return respond(endpoints.switchEgress, switched);
        }
      )
    );

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Switch' }));

    expect(
      await screen.findByRole('button', { name: 'Switching...' })
    ).toBeDisabled();

    release?.();

    await waitFor(() =>
      expect(within(activeRow('02-ch')).getByText('Active')).toBeInTheDocument()
    );
  });

  it('shows the check in flight and cannot be pressed twice', async () => {
    const checked = {
      ...READ,
      configs: [
        {
          ...READ.configs[0],
          lastCheckAt: new Date().toISOString(),
          lastExitIp: '185.0.0.9'
        },
        READ.configs[1]
      ]
    };
    let release: (() => void) | undefined;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        respond(endpoints.egress, READ)
      ),
      http.post(mockUrl(endpoints.checkEgress), async () => {
        await gate;

        return respond(endpoints.checkEgress, checked);
      })
    );

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Check' }));

    expect(
      await screen.findByRole('button', { name: 'Checking...' })
    ).toBeDisabled();

    release?.();

    expect(
      await screen.findByText('Provider saw 185.0.0.9')
    ).toBeInTheDocument();
  });

  it('reports a check that could not be completed', async () => {
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        respond(endpoints.egress, READ)
      ),
      http.post(mockUrl(endpoints.checkEgress), () =>
        problemResponse({
          code: ProblemCode.InternalError,
          status: 500,
          title: 'Internal Server Error'
        })
      )
    );

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Check' }));

    expect(
      await screen.findByText('The check could not be completed.')
    ).toBeInTheDocument();
  });
});
