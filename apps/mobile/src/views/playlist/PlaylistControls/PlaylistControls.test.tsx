import { describe, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  PlaylistSort,
  Provider,
  TrackFileStatus,
  type TrackFileStatusCounts
} from '@playliberty/contracts';
import { I18nProvider, Language } from '@playliberty/i18n';

import PlaylistControls from './PlaylistControls';

const store = { getItem: () => null, setItem: () => {} };

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

const counts: TrackFileStatusCounts = {
  stored: 6,
  pending: 0,
  downloading: 0,
  failed: 4,
  unavailable: 0
};

async function renderControls(active: TrackFileStatus | null) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <PlaylistControls
          sort={PlaylistSort.Playlist}
          canEdit
          shuffled={false}
          saving={false}
          counts={counts}
          remoteRemoved={0}
          provider={Provider.Youtube}
          active={active}
          onSortChange={jest.fn()}
          onFilterChange={jest.fn()}
        />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

async function measureRail(): Promise<void> {
  await act(async () => {
    screen.getByTestId('playlist-filter-rail').props.onLayout({
      nativeEvent: { layout: { width: 200 } }
    });
    screen.getByTestId('playlist-chips').props.onLayout({
      nativeEvent: { layout: { x: 150, width: 400 } }
    });
    screen.getByTestId('filter-chip-failed').props.onLayout({
      nativeEvent: { layout: { x: 226, width: 90 } }
    });
  });
}

describe('the detail filter rail', () => {
  it('reveals a restored filter on its first measurement without a tween', async () => {
    const scrollTo = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => {});

    await renderControls(TrackFileStatus.Failed);
    await measureRail();

    expect(scrollTo).toHaveBeenCalledWith({
      x: 150 + 226 + 90 - 200 + 12,
      animated: false
    });

    scrollTo.mockRestore();
  });

  it('leaves the rail at its start for the default filter', async () => {
    const scrollTo = jest
      .spyOn(ScrollView.prototype, 'scrollTo')
      .mockImplementation(() => {});

    await renderControls(null);
    await measureRail();

    expect(scrollTo).not.toHaveBeenCalled();

    scrollTo.mockRestore();
  });
});
