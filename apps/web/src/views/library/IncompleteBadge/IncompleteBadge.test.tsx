import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';

import { TrackFileStatus } from '@playliberty/contracts';
import type { TrackFileStatusCounts } from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import { EMPTY_COUNTS } from '../../../testing/mocks/handlers';
import IncompleteBadge from './IncompleteBadge';

/*
 * The mark is presentational, so nothing here mounts a server: what is under
 * test is what one pill says for a set of counts.
 */

function counts(
  overrides: Partial<TrackFileStatusCounts> = {}
): TrackFileStatusCounts {
  return { ...EMPTY_COUNTS, ...overrides };
}

function renderMark(value: TrackFileStatusCounts | null) {
  return render(
    <I18nProvider preferred={['en']}>
      <IncompleteBadge counts={value} />
    </I18nProvider>
  );
}

describe('IncompleteBadge', () => {
  it('draws one pill carrying how many tracks are not stored', async () => {
    renderMark(
      counts({ [TrackFileStatus.Stored]: 7, [TrackFileStatus.Failed]: 3 })
    );

    const pill = await screen.findByRole('img');

    expect(pill).toHaveTextContent('3');
    expect(screen.getAllByRole('img')).toHaveLength(1);
  });

  /*
   * One pill however many reasons are missing: the count is every track whose
   * file is not here, and the breakdown is the pill's own content.
   */
  it('draws one pill and one row per reason when several reasons are missing', async () => {
    renderMark(
      counts({
        [TrackFileStatus.Stored]: 4,
        [TrackFileStatus.Pending]: 2,
        [TrackFileStatus.Downloading]: 1,
        [TrackFileStatus.Failed]: 3,
        [TrackFileStatus.Unavailable]: 5
      })
    );

    const pill = await screen.findByRole('img');

    expect(screen.getAllByRole('img')).toHaveLength(1);
    /* Eleven of sixteen: the sum of the four reasons and never the stored ones. */
    expect(pill).toHaveTextContent('11');

    const rows = pill.querySelectorAll('span[data-tone]');
    expect(Array.from(rows, row => row.textContent)).toEqual([
      'Pending2',
      'Downloading1',
      'Failed3',
      'Unavailable5'
    ]);
  });

  it('leaves a reason with no tracks out of the breakdown', async () => {
    renderMark(counts({ [TrackFileStatus.Failed]: 1 }));

    const pill = await screen.findByRole('img');
    const rows = pill.querySelectorAll('span[data-tone]');

    expect(Array.from(rows, row => row.textContent)).toEqual(['Failed1']);
  });

  /*
   * A `role="img"`'s children are not read out, so the breakdown must be in the
   * label too, not only the pointer-reachable tip.
   */
  it('names the count and the breakdown in its label', async () => {
    renderMark(
      counts({
        [TrackFileStatus.Stored]: 1,
        [TrackFileStatus.Failed]: 3,
        [TrackFileStatus.Unavailable]: 4
      })
    );

    expect(
      await screen.findByRole('img', {
        name: '7 tracks are not stored · Failed 3 · Unavailable 4'
      })
    ).toBeInTheDocument();
  });

  it('reads one track in the singular', async () => {
    renderMark(counts({ [TrackFileStatus.Pending]: 1 }));

    expect(
      await screen.findByRole('img', {
        name: '1 track is not stored · Pending 1'
      })
    ).toBeInTheDocument();
  });

  it('draws nothing when every track is stored', async () => {
    const { container } = renderMark(counts({ [TrackFileStatus.Stored]: 12 }));

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('draws nothing when the reader has no counts', async () => {
    const { container } = renderMark(null);

    expect(container).toBeEmptyDOMElement();
  });

  it('has no axe violations', async () => {
    const { container } = renderMark(
      counts({ [TrackFileStatus.Stored]: 1, [TrackFileStatus.Downloading]: 2 })
    );

    await screen.findByRole('img');

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
