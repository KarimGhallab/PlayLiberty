import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
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
});
