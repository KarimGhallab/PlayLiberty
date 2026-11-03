import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { I18nProvider, Language } from '@playliberty/i18n';

import SeekBar from './SeekBar';

const store = { getItem: () => null, setItem: () => {} };
const noop = (): void => {};

describe('the seek bar', () => {
  it('keeps an hour-long duration on one line', async () => {
    await render(
      <I18nProvider initialLanguage={Language.English} storage={store}>
        <SeekBar
          durationSeconds={4736}
          positionSeconds={0}
          onSeekStart={noop}
          onSeekEnd={noop}
          onSeek={noop}
          onSeekBy={noop}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('player-duration')).toHaveTextContent('1:18:56');
    expect(screen.getByTestId('player-duration').props.numberOfLines).toBe(1);
    expect(screen.getByTestId('player-elapsed').props.numberOfLines).toBe(1);
  });
});
