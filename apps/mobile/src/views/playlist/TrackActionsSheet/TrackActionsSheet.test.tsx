import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  Provider,
  type Track,
  TrackFileStatus,
  TrackSourceStatus
} from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import TrackActionsSheet from './TrackActionsSheet';
import { trackActionsFor } from './trackActions';

const store = { getItem: () => null, setItem: () => {} };

jest.setTimeout(15000);

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

const failed: Track = {
  id: 'track-1',
  provider: Provider.Youtube,
  videoId: 'video-1',
  title: 'Broken Song',
  durationSeconds: 182,
  skipNonMusic: false,
  thumbnailPath: null,
  fileStatus: TrackFileStatus.Failed,
  sourceStatus: TrackSourceStatus.Available,
  failureKind: null,
  failureReason: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z'
};

async function renderSheet(language = Language.English) {
  const onSelect = jest.fn();
  const onClose = jest.fn();
  const actions = trackActionsFor(failed, true, true, false);

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={language} storage={store}>
        <TrackActionsSheet
          trackTitle={failed.title}
          actions={actions}
          onSelect={onSelect}
          onClose={onClose}
        />
      </I18nProvider>
    </SafeAreaProvider>
  );

  return { onSelect, onClose };
}

describe('the track actions sheet', () => {
  it('draws the copy and the two repairs', async () => {
    await renderSheet();

    expect(screen.getByTestId('track-actions-sheet')).toBeOnTheScreen();
    expect(screen.getByTestId('track-action-copy')).toBeOnTheScreen();
    expect(screen.getByTestId('track-action-retry')).toBeOnTheScreen();
    expect(screen.getByTestId('track-action-fetchWhole')).toBeOnTheScreen();
    expect(screen.getByText('Copy link')).toBeOnTheScreen();
    expect(screen.getByText('Retry')).toBeOnTheScreen();
    expect(screen.getByText('Fetch whole')).toBeOnTheScreen();
  });

  it('selects an item', async () => {
    const { onSelect } = await renderSheet();

    fireEvent.press(screen.getByTestId('track-action-retry'));

    expect(onSelect).toHaveBeenCalledWith('retry');
  });

  it('closes from the backdrop', async () => {
    const { onClose } = await renderSheet();

    fireEvent.press(screen.getByTestId('track-actions-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('draws its items in French', async () => {
    await renderSheet(Language.French);

    expect(screen.getByText('Copier le lien')).toBeOnTheScreen();
    expect(screen.getByText('Réessayer')).toBeOnTheScreen();
    expect(screen.getByText('Récupérer en entier')).toBeOnTheScreen();
  });
});
