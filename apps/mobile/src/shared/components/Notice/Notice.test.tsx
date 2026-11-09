import { describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Notice, { dismissesOnSwipe } from './Notice';

jest.mock('../../a11y/useReduceMotion/useReduceMotion', () => ({
  useReduceMotion: () => true
}));

jest.mock('@playliberty/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function renderNotice(detail: string | null = null, durationMs?: number) {
  const onDismiss = jest.fn();

  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <Notice
        message="Started 3 syncs"
        detail={detail}
        onDismiss={onDismiss}
        durationMs={durationMs}
      />
    </SafeAreaProvider>
  );

  return { onDismiss };
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

  it('closes from its control', async () => {
    const { onDismiss } = await renderNotice();

    await fireEvent.press(screen.getByRole('button', { name: 'common.close' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('withdraws itself after its window', async () => {
    const { onDismiss } = await renderNotice(null, 100);

    await sleep(200);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('holds the notice when the reader asks for more time', async () => {
    const { onDismiss } = await renderNotice(null, 300);

    await sleep(100);

    const body = screen.getByTestId('notice-body');

    expect(body.props.accessibilityActions).toEqual([
      { name: 'extend', label: 'common.moreTime' }
    ]);

    await act(async () => {
      await fireEvent(body, 'accessibilityAction', {
        nativeEvent: { actionName: 'extend' }
      });
    });

    await sleep(250);
    expect(onDismiss).not.toHaveBeenCalled();

    await sleep(150);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('leaves on a long swipe or a fast flick, either way', () => {
    expect(dismissesOnSwipe(120, 0, 390)).toBe(true);
    expect(dismissesOnSwipe(-120, 0, 390)).toBe(true);
    expect(dismissesOnSwipe(60, 0, 390)).toBe(false);
    expect(dismissesOnSwipe(40, 0.6, 390)).toBe(true);
    expect(dismissesOnSwipe(20, 0.6, 390)).toBe(false);
  });
});
