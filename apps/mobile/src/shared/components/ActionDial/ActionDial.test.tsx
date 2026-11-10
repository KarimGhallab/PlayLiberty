import { describe, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  within
} from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ActionDial from './ActionDial';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

async function renderDial() {
  const add = jest.fn();
  const sync = jest.fn();

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ActionDial
        label="Library actions"
        testID="dial"
        actions={[
          {
            key: 'add',
            testID: 'dial-add',
            label: 'Add a playlist',
            icon: 'add',
            onPress: add
          },
          {
            key: 'sync',
            testID: 'dial-sync',
            label: 'Sync all 3 playlists',
            icon: 'sync',
            accent: true,
            onPress: sync
          }
        ]}
      />
    </SafeAreaProvider>
  );

  return { add, sync };
}

describe('the action dial', () => {
  it('runs the action when the label is pressed', async () => {
    const { add } = await renderDial();
    await fireEvent.press(screen.getByTestId('dial'));

    await fireEvent.press(screen.getByText('Add a playlist'));

    expect(add).toHaveBeenCalledTimes(1);
  });

  it('reads a row as one control', async () => {
    await renderDial();
    await fireEvent.press(screen.getByTestId('dial'));

    const row = screen.getByRole('button', { name: 'Add a playlist' });

    expect(within(row).getByText('Add a playlist')).toBeOnTheScreen();
  });

  it('closes from the scrim', async () => {
    await renderDial();
    await fireEvent.press(screen.getByTestId('dial'));

    expect(screen.getByTestId('dial-add')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('dial-scrim'));

    expect(screen.queryByTestId('dial-add')).not.toBeOnTheScreen();
  });
});
