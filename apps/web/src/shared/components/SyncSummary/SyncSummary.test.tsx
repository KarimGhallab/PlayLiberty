import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SyncRun } from '@playliberty/contracts';
import { SyncRunStatus } from '@playliberty/contracts';
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
    'downloadingCount' | 'onRetryFailed' | 'retryingFailed'
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
        failedCount={failedCount}
        {...extras}
      />
    </I18nProvider>
  );
}

describe('SyncSummary', () => {
  it('draws the four figures the last sync produced', () => {
    renderSummary(run(), 1);

    expect(screen.getByRole('group', { name: '3 kept' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '5 added' })).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: '2 removed' })
    ).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '1 failed' })).toBeInTheDocument();
    expect(screen.getByText('Last sync 55 minutes ago')).toBeInTheDocument();
  });

  /* Downloads fail after the run settles, so the band reports the playlist's
   * live failures rather than the figure the run recorded. */
  it("draws the tracks failed rather than the run's settled figure", () => {
    renderSummary(run({ addedCount: 4, failedCount: 0 }), 4);

    expect(screen.getByRole('group', { name: '4 failed' })).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: '0 failed' })
    ).not.toBeInTheDocument();
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

  it('draws no downloading line once the run has finished', () => {
    renderSummary(run(), 1, { downloadingCount: 4 });

    expect(screen.queryByText('4 downloading')).not.toBeInTheDocument();
  });
});
