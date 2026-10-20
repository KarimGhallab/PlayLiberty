import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Provider } from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import SyncError from './SyncError';

/*
 * The band's contract at its public interface: the sentence, the
 * reassurance, the action, and the server's words one control away.
 */

const SENTENCE = 'Could not reach YouTube, the playlist may not be up to date.';

function renderError(props: Partial<Parameters<typeof SyncError>[0]> = {}) {
  return render(
    <I18nProvider preferred={['en']}>
      <SyncError
        trackCount={3}
        provider={Provider.Youtube}
        rawError={null}
        {...props}
      />
    </I18nProvider>
  );
}

describe('SyncError', () => {
  it('names the fault in a sentence', () => {
    renderError();

    expect(screen.getByText(SENTENCE)).toBeInTheDocument();
  });

  it('reassures with the number of tracks that are still here', () => {
    renderError();

    expect(
      screen.getByText(/All 3 tracks are still here and will never be deleted/)
    ).toBeInTheDocument();
  });

  it('reassures in the singular for one track', () => {
    renderError({ trackCount: 1 });

    expect(
      screen.getByText(/All 1 track is still here and will never be deleted/)
    ).toBeInTheDocument();
  });

  it('keeps the reassurance quiet at zero tracks', () => {
    renderError({ trackCount: 0 });

    expect(
      screen.queryByText(/still here and will never be deleted/)
    ).not.toBeInTheDocument();
  });

  it('keeps the reassurance quiet when the count is unknown', () => {
    renderError({ trackCount: null });

    expect(
      screen.queryByText(/still here and will never be deleted/)
    ).not.toBeInTheDocument();
  });

  it('offers the retry when retrying can work', () => {
    renderError({ onRetry: () => undefined });

    expect(screen.getByRole('button', { name: 'Sync' })).toBeEnabled();
  });

  it('offers no retry when it cannot work', () => {
    renderError();

    expect(
      screen.queryByRole('button', { name: 'Sync' })
    ).not.toBeInTheDocument();
  });

  it('shows the retry working and locks it', () => {
    renderError({ onRetry: () => undefined, retrying: true });

    expect(screen.getByRole('button', { name: 'Syncing' })).toBeDisabled();
  });

  it("reveals the server's words on demand", () => {
    renderError({ rawError: 'yt-dlp exited with code 1' });

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
    renderError();

    expect(
      screen.queryByRole('button', { name: 'Show details' })
    ).not.toBeInTheDocument();
  });
});
