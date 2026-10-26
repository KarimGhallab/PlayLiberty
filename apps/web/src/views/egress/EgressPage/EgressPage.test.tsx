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
      lastExitIp: null,
      lastError: null
    },
    {
      name: '02-ch',
      endpoint: null,
      status: EgressStatus.Unknown,
      active: false,
      lastAttemptAt: null,
      lastProbeAt: null,
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
    expect(screen.getAllByText('Never')[0]).toBeInTheDocument();
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

  it('probes an exit and draws the measured address', async () => {
    const probed = {
      ...READ,
      configs: [
        {
          ...READ.configs[0],
          status: EgressStatus.Ok,
          lastProbeAt: new Date().toISOString(),
          lastExitIp: '185.0.0.9'
        },
        READ.configs[1]
      ]
    };
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        respond(endpoints.egress, READ)
      ),
      http.post(mockUrl(endpoints.probeEgress, { name: '01-fr' }), () =>
        respond(endpoints.probeEgress, probed)
      )
    );

    renderPage();

    const buttons = await screen.findAllByRole('button', { name: 'Test' });
    fireEvent.click(buttons[0]);

    expect(await screen.findByText('Seen at 185.0.0.9')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'OK' })).toBeInTheDocument();
  });

  it('reports an unreachable agent without claiming the probe ran', async () => {
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        respond(endpoints.egress, READ)
      ),
      http.post(mockUrl(endpoints.probeEgress, { name: '01-fr' }), () =>
        respond(endpoints.probeEgress, { ...READ, agentReachable: false })
      )
    );

    renderPage();

    const buttons = await screen.findAllByRole('button', { name: 'Test' });
    fireEvent.click(buttons[0]);

    expect(
      await screen.findByText('The egress agent could not be reached.')
    ).toBeInTheDocument();
  });

  it('reports a probe that could not be run', async () => {
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        respond(endpoints.egress, READ)
      ),
      http.post(mockUrl(endpoints.probeEgress, { name: '01-fr' }), () =>
        problemResponse({
          code: ProblemCode.InternalError,
          status: 500,
          title: 'Internal Server Error'
        })
      )
    );

    renderPage();

    const buttons = await screen.findAllByRole('button', { name: 'Test' });
    fireEvent.click(buttons[0]);

    expect(
      await screen.findByText('The test could not be run.')
    ).toBeInTheDocument();
  });
});

describe('switching an exit by hand', () => {
  it('disables the active row and moves the marker after a switch', async () => {
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
    expect(switches[0]).toBeDisabled();
    expect(switches[1]).toBeEnabled();

    fireEvent.click(switches[1]);

    const row = (await screen.findByText('02-ch')).closest('tr');
    expect(within(row as HTMLElement).getByText('Active')).toBeInTheDocument();
    expect(
      within(row as HTMLElement).getByRole('button', { name: 'Switch' })
    ).toBeDisabled();
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

    const switches = await screen.findAllByRole('button', { name: 'Switch' });
    fireEvent.click(switches[1]);

    expect(
      await screen.findByText('No WireGuard interface is configured.')
    ).toBeInTheDocument();

    const row = screen.getByText('01-fr').closest('tr');
    expect(within(row as HTMLElement).getByText('Active')).toBeInTheDocument();
  });

  it('reports an unreachable agent without moving the marker', async () => {
    server.use(
      http.get(mockUrl(endpoints.egress), () =>
        respond(endpoints.egress, READ)
      ),
      http.post(mockUrl(endpoints.switchEgress, { name: '02-ch' }), () =>
        respond(endpoints.switchEgress, { ...READ, agentReachable: false })
      )
    );

    renderPage();

    const switches = await screen.findAllByRole('button', { name: 'Switch' });
    fireEvent.click(switches[1]);

    expect(
      await screen.findByText('The egress agent could not be reached.')
    ).toBeInTheDocument();

    const row = screen.getByText('01-fr').closest('tr');
    expect(within(row as HTMLElement).getByText('Active')).toBeInTheDocument();
  });

  it('cannot be pressed twice while the switch is in flight', async () => {
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

    const switches = await screen.findAllByRole('button', { name: 'Switch' });
    fireEvent.click(switches[1]);

    expect(
      await screen.findByRole('button', { name: 'Switching...' })
    ).toBeDisabled();

    release?.();

    const row = screen.getByText('02-ch').closest('tr') as HTMLElement;
    await waitFor(() =>
      expect(within(row).getByText('Active')).toBeInTheDocument()
    );
  });
});
