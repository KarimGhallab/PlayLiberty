import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Screen from './Screen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

function wrapper({ children }: { readonly children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={metrics}>{children}</SafeAreaProvider>
  );
}

describe('Screen', () => {
  it('announces its title as a heading', async () => {
    await render(<Screen title="Library" subtitle="Your playlists" />, {
      wrapper
    });

    expect(screen.getByRole('header', { name: 'Library' })).toBeOnTheScreen();
    expect(screen.getByText('Your playlists')).toBeOnTheScreen();
  });

  it('draws no heading when it has no title', async () => {
    await render(
      <Screen>
        <Text>Body</Text>
      </Screen>,
      { wrapper }
    );

    expect(screen.queryByRole('header')).not.toBeOnTheScreen();
    expect(screen.getByText('Body')).toBeOnTheScreen();
  });

  it('draws the way back before the title', async () => {
    const onBack = jest.fn();

    await render(<Screen title="Egress" onBack={onBack} backLabel="Back" />, {
      wrapper
    });

    await fireEvent.press(screen.getByLabelText('Back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
