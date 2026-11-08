import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider, Language } from '@playliberty/i18n';

import type { PlaylistAction } from '@playliberty/library';
import PlaylistActionsSheet from './PlaylistActionsSheet';

const store = { getItem: () => null, setItem: () => {} };

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

const pin: PlaylistAction = { key: 'pin', label: 'header.pin' };

async function renderSheet(actions: readonly PlaylistAction[] = []) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <PlaylistActionsSheet
          playlistName="Grèce"
          actions={actions}
          onSelect={jest.fn()}
          onClose={jest.fn()}
          summary={<Text>Up to date</Text>}
          extra={<Text>Skip non-music parts</Text>}
        />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

describe('the playlist actions sheet', () => {
  it('draws one rule between the summary and the settings with no actions', async () => {
    await renderSheet();

    expect(screen.getByTestId('playlist-actions-summary')).toHaveStyle({
      borderBottomWidth: 0
    });
    expect(screen.getByTestId('playlist-actions-extra')).toHaveStyle({
      borderTopWidth: 1
    });
  });

  it('keeps the summary rule when there are actions', async () => {
    await renderSheet([pin]);

    expect(screen.getByTestId('playlist-actions-summary')).toHaveStyle({
      borderBottomWidth: 1
    });
  });
});
