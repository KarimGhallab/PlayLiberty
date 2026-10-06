import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SyncError from './SyncError';

/*
 * The band's contract, asserted at its public interface: the sentence that names
 * the fault, the reassurance that says what was not lost, the one action, and the
 * server's own words one control away. The point is that removing any of them
 * fails the suite, so the reason cannot quietly become unreachable again.
 */

const SENTENCE =
  'Could not reach YouTube, so this playlist is not up to date with its source.';

describe('SyncError', () => {
  it('names the fault in a sentence', () => {
    render(<SyncError trackCount={3} rawError={null} />);

    expect(screen.getByText(SENTENCE)).toBeInTheDocument();
  });

  it('reassures with the number of tracks that are still here', () => {
    render(<SyncError trackCount={3} rawError={null} />);

    expect(
      screen.getByText(/All 3 tracks are still here and still playable/)
    ).toBeInTheDocument();
  });

  it('reassures in the singular for one track', () => {
    render(<SyncError trackCount={1} rawError={null} />);

    expect(
      screen.getByText(/All 1 track is still here and still playable/)
    ).toBeInTheDocument();
  });

  it('keeps the reassurance quiet at zero tracks', () => {
    render(<SyncError trackCount={0} rawError={null} />);

    expect(
      screen.queryByText(/still here and still playable/)
    ).not.toBeInTheDocument();
  });

  it('keeps the reassurance quiet when the count is unknown', () => {
    render(<SyncError trackCount={null} rawError={null} />);

    expect(
      screen.queryByText(/still here and still playable/)
    ).not.toBeInTheDocument();
  });

  it('offers the retry when retrying can work', () => {
    render(
      <SyncError trackCount={3} rawError={null} onRetry={() => undefined} />
    );

    expect(screen.getByRole('button', { name: 'Sync now' })).toBeEnabled();
  });

  it('offers no retry when it cannot work', () => {
    render(<SyncError trackCount={3} rawError={null} />);

    expect(
      screen.queryByRole('button', { name: 'Sync now' })
    ).not.toBeInTheDocument();
  });

  it('shows the retry working and locks it', () => {
    render(
      <SyncError
        trackCount={3}
        rawError={null}
        onRetry={() => undefined}
        retrying
      />
    );

    expect(screen.getByRole('button', { name: 'Syncing' })).toBeDisabled();
  });

  it("reveals the server's words on demand", () => {
    render(<SyncError trackCount={3} rawError="yt-dlp exited with code 1" />);

    expect(
      screen.queryByText('yt-dlp exited with code 1')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show details' }));

    expect(screen.getByText('yt-dlp exited with code 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide details' }));

    expect(
      screen.queryByText('yt-dlp exited with code 1')
    ).not.toBeInTheDocument();
  });

  it('offers no reveal when there is nothing to reveal', () => {
    render(<SyncError trackCount={3} rawError={null} />);

    expect(
      screen.queryByRole('button', { name: 'Show details' })
    ).not.toBeInTheDocument();
  });
});
