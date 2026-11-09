import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SyncRun } from '@playliberty/contracts';
import { Provider, SyncRunStatus } from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import SyncSummary from './SyncSummary';

/*
 * The detail page's test covers that the page draws the summary; this covers
 * what it draws.
 */

const NOW = new Date('2026-10-08T12:00:00.000Z');

function run(overrides: Partial<SyncRun> = {}): SyncRun {
  return {
    id: 'run-1',
    playlistId: 'playlist-1',
    status: SyncRunStatus.Completed,
    addedCount: 5,
    retainedCount: 3,
    removedCount: 2,
    failedCount: 1,
    startedAt: '2026-10-08T11:00:00.000Z',
    finishedAt: '2026-10-08T11:05:00.000Z',
    error: null,
    ...overrides
  };
}

type SummaryExtras = Partial<
  Pick<
    Parameters<typeof SyncSummary>[0],
    | 'downloadingCount'
    | 'onRetryFailed'
    | 'retryingFailed'
    | 'showRunningStamp'
    | 'remoteRemoved'
    | 'provider'
    | 'onCancel'
    | 'cancelling'
    | 'playlistName'
  >
>;

function renderSummary(
  summary: SyncRun,
  failedCount: number,
  extras: SummaryExtras = {}
) {
  return render(
    <I18nProvider preferred={['en']}>
      <SyncSummary
        run={summary}
        now={NOW}
        playlistName="Rain On The Window"
        failedCount={failedCount}
        remoteRemoved={0}
        provider={Provider.Youtube}
        {...extras}
      />
    </I18nProvider>
  );
}

describe('SyncSummary', () => {
  it('names the stored tracks whose source removed them', () => {
    renderSummary(run(), 1, { provider: Provider.Youtube, remoteRemoved: 2 });

    expect(
      screen.getByText('2 tracks removed from YouTube are still stored')
    ).toBeInTheDocument();
  });

  it('says nothing about retention while it holds none', () => {
    renderSummary(run(), 1, { provider: Provider.Youtube });

    expect(
      screen.queryByText(/removed from YouTube are still stored/)
    ).not.toBeInTheDocument();
  });

  it('draws the four figures the last sync produced', () => {
    renderSummary(run(), 1);

    expect(screen.getByRole('group', { name: '3 kept' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '5 added' })).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: '2 removed' })
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '1 failed' })).toBeInTheDocument();
  });

  /* Downloads fail after the run settles, so the band reports live failures, not
   * the recorded figure; zero cells are not drawn at all. */
  it("draws the live failures and hides the run's zeroes", () => {
    renderSummary(
      run({ retainedCount: 0, addedCount: 4, removedCount: 0, failedCount: 0 }),
      4
    );

    expect(screen.getByRole('group', { name: '4 added' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '4 failed' })).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: '0 kept' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: '0 removed' })
    ).not.toBeInTheDocument();
  });

  it('says nothing changed rather than drawing four zeroes', () => {
    renderSummary(
      run({ retainedCount: 0, addedCount: 0, removedCount: 0, failedCount: 0 }),
      0
    );

    expect(screen.getByText('Nothing changed')).toBeInTheDocument();
    expect(screen.queryAllByRole('group')).toHaveLength(0);
  });

  it('writes the French stamp as one sentence', () => {
    render(
      <I18nProvider preferred={['fr']}>
        <SyncSummary
          run={run()}
          now={NOW}
          playlistName="Rain On The Window"
          failedCount={1}
          remoteRemoved={0}
          provider={Provider.Youtube}
        />
      </I18nProvider>
    );

    expect(
      screen.getByText('Dernière synchronisation : il y a 55 minutes')
    ).toBeInTheDocument();
  });

  it('offers one counted retry for the failed set', () => {
    const onRetry = vi.fn();
    renderSummary(run(), 4, { onRetryFailed: onRetry });

    fireEvent.click(
      screen.getByRole('button', { name: 'Retry all 4 failed tracks' })
    );

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('states the count and holds the control while the retry runs', () => {
    renderSummary(run(), 4, {
      onRetryFailed: vi.fn(),
      retryingFailed: true
    });

    expect(
      screen.getByRole('button', {
        name: 'Retrying all 4 failed tracks...'
      })
    ).toBeDisabled();
  });

  it('draws the downloading line and its own stamp while a run is active', () => {
    renderSummary(run({ status: SyncRunStatus.Running, finishedAt: null }), 0, {
      downloadingCount: 4
    });

    expect(screen.getByText('4 downloading')).toBeInTheDocument();
    expect(screen.getByText('Syncing')).toBeInTheDocument();
  });

  it('leaves the running word to the caller when it already names the sync', () => {
    renderSummary(run({ status: SyncRunStatus.Running, finishedAt: null }), 0, {
      downloadingCount: 4,
      showRunningStamp: false
    });

    expect(screen.getByText('4 downloading')).toBeInTheDocument();
    expect(screen.queryByText('Syncing')).not.toBeInTheDocument();
  });

  it('draws no downloading line once the run has finished', () => {
    renderSummary(run(), 1, { downloadingCount: 4 });

    expect(screen.queryByText('4 downloading')).not.toBeInTheDocument();
  });

  it('renders a cancelled run as a neutral stamp without counts or retry', () => {
    renderSummary(
      run({
        status: SyncRunStatus.Cancelled,
        addedCount: 0,
        retainedCount: 0,
        removedCount: 0,
        failedCount: 0
      }),
      3,
      { onRetryFailed: vi.fn() }
    );

    expect(screen.getByText('Sync cancelled')).toBeInTheDocument();
    expect(screen.queryAllByRole('group')).toHaveLength(0);
    expect(screen.queryByText('Nothing changed')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Retry all/ })
    ).not.toBeInTheDocument();
  });

  it('offers Cancel for a running run and names the playlist', () => {
    const onCancel = vi.fn();
    renderSummary(run({ status: SyncRunStatus.Running, finishedAt: null }), 0, {
      onCancel
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cancel sync, Rain On The Window'
      })
    );

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('reads Cancelling and stays disabled while the cancel is pending', () => {
    renderSummary(run({ status: SyncRunStatus.Running, finishedAt: null }), 0, {
      onCancel: vi.fn(),
      cancelling: true
    });

    const control = screen.getByRole('button', {
      name: 'Cancelling..., Rain On The Window'
    });

    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Syncing')).toBeInTheDocument();
  });

  it('offers no Cancel for a settled run', () => {
    renderSummary(run(), 0, { onCancel: vi.fn() });

    expect(
      screen.queryByRole('button', { name: /Cancel sync/ })
    ).not.toBeInTheDocument();
  });
});
