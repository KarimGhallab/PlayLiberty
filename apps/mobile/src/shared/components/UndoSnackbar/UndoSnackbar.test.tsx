import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Animated } from 'react-native';

import UndoSnackbar, { type UndoSnackbarProps } from './UndoSnackbar';

jest.mock('../../a11y/useReduceMotion', () => ({
  useReduceMotion: () => false
}));

jest.mock('@playliberty/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 })
}));

/* The windows here are short so the test runs on real timers. */
const WINDOW_MS = 200;
const HOLD_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function snackbar(props: Partial<UndoSnackbarProps> = {}) {
  return (
    <UndoSnackbar
      message="Deleting playlist"
      detail="Chine"
      onExpire={jest.fn()}
      onUndo={jest.fn()}
      durationMs={WINDOW_MS}
      {...props}
    />
  );
}

beforeEach(() => {
  jest
    .spyOn(Animated, 'timing')
    .mockImplementation(
      () => ({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() }) as never
    );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the undo snackbar', () => {
  it('reports Undo without waiting for the window', async () => {
    const onUndo = jest.fn();
    const view = await render(snackbar({ onUndo }));

    await act(async () => {
      await fireEvent.press(view.getByText('common.undo'));
    });

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('extends the window from the accessibility action', async () => {
    const onExpire = jest.fn();
    const onUndo = jest.fn();
    const view = await render(snackbar({ onExpire, onUndo }));

    await sleep(80);

    const body = view.getByText('Deleting playlist').parent;

    expect(body?.props.accessibilityActions).toEqual([
      { name: 'extend', label: 'common.moreTime' }
    ]);

    await act(async () => {
      body?.props.onAccessibilityAction({
        nativeEvent: { actionName: 'extend' }
      });
    });

    await sleep(HOLD_MS);
    expect(onExpire).not.toHaveBeenCalled();

    await act(async () => {
      await fireEvent.press(view.getByText('common.undo'));
    });

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('holds the window open while the surface is touched', async () => {
    const onExpire = jest.fn();
    const view = await render(snackbar({ onExpire }));

    await sleep(80);
    await act(async () => {
      await fireEvent(view.getByTestId('undo-snackbar'), 'touchStart');
    });

    await sleep(HOLD_MS);
    expect(onExpire).not.toHaveBeenCalled();

    await act(async () => {
      await fireEvent(view.getByTestId('undo-snackbar'), 'touchEnd');
    });

    await waitFor(
      () => {
        expect(onExpire).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 }
    );
  });

  it('honours a press that began inside the window after it expired', async () => {
    const onUndo = jest.fn();
    const onExpire = jest.fn();
    const view = await render(snackbar({ onUndo, onExpire }));
    const inside = performance.now();

    await sleep(WINDOW_MS + 50);
    expect(onExpire).toHaveBeenCalledTimes(1);

    await act(async () => {
      await fireEvent(view.getByTestId('undo-snackbar'), 'touchStart', {
        nativeEvent: { timestamp: inside }
      });
    });
    await act(async () => {
      await fireEvent.press(view.getByText('common.undo'));
    });

    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it('refuses a press that began after the window', async () => {
    const onUndo = jest.fn();
    const view = await render(snackbar({ onUndo }));

    await sleep(WINDOW_MS + 50);
    const outside = performance.now();

    await act(async () => {
      await fireEvent(view.getByTestId('undo-snackbar'), 'touchStart', {
        nativeEvent: { timestamp: outside }
      });
    });
    await act(async () => {
      await fireEvent.press(view.getByText('common.undo'));
    });

    expect(onUndo).not.toHaveBeenCalled();
  });
});
