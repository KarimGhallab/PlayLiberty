import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react-native';
import { useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  PanResponder,
  StyleSheet,
  Text
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Sheet, { dismissesOnDrag } from './Sheet';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

afterEach(() => {
  jest.restoreAllMocks();
});

function sheetTranslateY(): number {
  const transform = StyleSheet.flatten(screen.getByTestId('sheet').props.style)
    .transform as { translateY: unknown }[];
  const value = transform[0]?.translateY as
    number | { __getValue: () => number };

  return typeof value === 'number' ? value : value.__getValue();
}

async function renderSheet(bottomInset = 0) {
  const onRequestClose = jest.fn();
  const safeMetrics = {
    ...metrics,
    insets: { ...metrics.insets, bottom: bottomInset }
  };

  const view = await render(
    <SafeAreaProvider initialMetrics={safeMetrics}>
      <Sheet
        visible
        title="Account"
        onRequestClose={onRequestClose}
        closeLabel="Close"
        testID="sheet"
        backdropTestID="sheet-backdrop">
        <Text>Content</Text>
      </Sheet>
    </SafeAreaProvider>
  );

  return { onRequestClose, view };
}

describe('the sheet frame', () => {
  it('draws its title as a heading and the content it is given', async () => {
    await renderSheet();

    expect(screen.getByRole('header', { name: 'Account' })).toBeOnTheScreen();
    expect(screen.getByText('Content')).toBeOnTheScreen();
  });

  it('asks to close when the backdrop is pressed', async () => {
    const { onRequestClose } = await renderSheet();

    await fireEvent.press(screen.getByTestId('sheet-backdrop'));

    expect(onRequestClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('sheet')).toBeOnTheScreen();
  });

  it('closes from its labelled control', async () => {
    const { onRequestClose } = await renderSheet();

    await fireEvent.press(screen.getByLabelText('Close'));

    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it('reports its exit once the modal is gone', async () => {
    const onExited = jest.fn();

    function Harness() {
      const [open, setOpen] = useState(true);

      return (
        <SafeAreaProvider initialMetrics={metrics}>
          <Sheet
            visible={open}
            title="Account"
            onRequestClose={() => setOpen(false)}
            onExited={onExited}
            closeLabel="Close"
            testID="sheet"
            backdropTestID="sheet-backdrop">
            <Text>Content</Text>
          </Sheet>
        </SafeAreaProvider>
      );
    }

    await render(<Harness />);

    expect(onExited).not.toHaveBeenCalled();
    expect(screen.getByTestId('sheet')).toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Close'));

    await waitFor(() => {
      expect(onExited).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId('sheet')).not.toBeOnTheScreen();
  });

  it('dismisses on a long drag or a fast flick, not on a short drag', () => {
    expect(dismissesOnDrag(81, 0)).toBe(true);
    expect(dismissesOnDrag(80, 0)).toBe(false);
    expect(dismissesOnDrag(0, 0.6)).toBe(true);
    expect(dismissesOnDrag(0, 0.5)).toBe(false);
  });

  it('leaves a dismissing drag to the exit instead of settling it back', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);

    let release: ((event: object, gesture: object) => void) | null = null;
    const create = PanResponder.create.bind(PanResponder);

    jest.spyOn(PanResponder, 'create').mockImplementation(config => {
      if (config.onStartShouldSetPanResponder !== undefined) {
        release = config.onPanResponderRelease as unknown as typeof release;
      }

      return create(config);
    });

    const onExited = jest.fn();

    function Harness() {
      const [open, setOpen] = useState(true);

      return (
        <SafeAreaProvider initialMetrics={metrics}>
          <Sheet
            visible={open}
            title="Account"
            onRequestClose={() => setOpen(false)}
            onExited={onExited}
            closeLabel="Close"
            testID="sheet"
            backdropTestID="sheet-backdrop">
            <Text>Content</Text>
          </Sheet>
        </SafeAreaProvider>
      );
    }

    await render(<Harness />);
    const motion = jest.spyOn(Animated, 'parallel');
    motion.mockClear();

    await act(() => {
      release?.({}, { dy: 200, vy: 0 });
    });

    await waitFor(() => {
      expect(onExited).toHaveBeenCalledTimes(1);
    });

    expect(motion).toHaveBeenCalledTimes(1);
  });

  it('keeps the panel still on a drag when the system asks for less motion', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);

    let move: ((event: object, gesture: object) => void) | null = null;
    let release: ((event: object, gesture: object) => void) | null = null;
    const create = PanResponder.create.bind(PanResponder);

    jest.spyOn(PanResponder, 'create').mockImplementation(config => {
      if (config.onStartShouldSetPanResponder !== undefined) {
        move = config.onPanResponderMove as unknown as typeof move;
        release = config.onPanResponderRelease as unknown as typeof release;
      }

      return create(config);
    });

    const { onRequestClose } = await renderSheet();
    const stay = sheetTranslateY();

    await act(() => {
      move?.({}, { dy: 200, vy: 0 });
    });

    expect(sheetTranslateY()).toBe(stay);

    await act(() => {
      release?.({}, { dy: 200, vy: 0 });
    });

    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });
});
