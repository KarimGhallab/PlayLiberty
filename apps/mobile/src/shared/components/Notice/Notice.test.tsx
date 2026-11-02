import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Notice, { dismissesOnSwipe } from './Notice';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

async function renderNotice(detail: string | null = null) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Notice message="Started 3 syncs" detail={detail} onDismiss={jest.fn()} />
    </SafeAreaProvider>
  );
}

describe('the notice', () => {
  it('draws the tally and its detail', async () => {
    await renderNotice('2 are already running');

    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(screen.getByText('Started 3 syncs')).toBeOnTheScreen();
    expect(screen.getByText('2 are already running')).toBeOnTheScreen();
  });

  it('draws no detail line when there is none', async () => {
    await renderNotice();

    expect(screen.queryByText('2 are already running')).not.toBeOnTheScreen();
  });

  it('leaves on a long swipe or a fast flick, either way', () => {
    expect(dismissesOnSwipe(120, 0, 390)).toBe(true);
    expect(dismissesOnSwipe(-120, 0, 390)).toBe(true);
    expect(dismissesOnSwipe(60, 0, 390)).toBe(false);
    expect(dismissesOnSwipe(40, 0.6, 390)).toBe(true);
    expect(dismissesOnSwipe(20, 0.6, 390)).toBe(false);
  });
});
