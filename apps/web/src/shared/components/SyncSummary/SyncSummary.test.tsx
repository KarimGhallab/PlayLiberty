import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SyncRunStatus } from '@playliberty/contracts';
import type { SyncRun } from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import SyncSummary from './SyncSummary';

/*
 * The detail page's test covers that the page draws the summary; this covers
 * what the summary draws.
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

function renderSummary(summary: SyncRun, downloadingCount?: number) {
  return render(
    <I18nProvider preferred={['en']}>
      <SyncSummary
        run={summary}
        now={NOW}
        downloadingCount={downloadingCount}
      />
    </I18nProvider>
  );
}

describe('SyncSummary', () => {
  it('draws the four figures a finished run produced', () => {
    renderSummary(run());

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('kept')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('added')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('removed')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('draws the downloading line and its own stamp while a run is active', () => {
    renderSummary(run({ status: SyncRunStatus.Running, finishedAt: null }), 4);

    expect(screen.getByText('4 downloading')).toBeInTheDocument();
    expect(screen.getByText('Syncing')).toBeInTheDocument();
  });

  it('draws no downloading line once the run has finished', () => {
    renderSummary(run(), 4);

    expect(screen.queryByText('4 downloading')).not.toBeInTheDocument();
  });
});
