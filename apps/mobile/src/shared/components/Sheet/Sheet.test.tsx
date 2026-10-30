import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { tokenLength } from '../../styles/tokens';
import Sheet, { dismissesOnDrag } from './Sheet';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 }
};

afterEach(() => {
  jest.restoreAllMocks();
});

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

    fireEvent.press(screen.getByTestId('sheet-backdrop'));

    expect(onRequestClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('sheet')).toBeOnTheScreen();
  });

  it('clears the bottom safe inset', async () => {
    await renderSheet(24);

    expect(screen.getByTestId('sheet')).toHaveStyle({
      paddingBottom: 24 + tokenLength('space-4')
    });
  });

  it('moves the sheet and fades the scrim instead of sliding the whole modal', async () => {
    const { view } = await renderSheet();

    const [modal] = view.container.queryAll(
      node => 'animationType' in node.props
    );

    expect(modal?.props.animationType).toBe('none');
    expect(screen.getByTestId('sheet-scrim')).toBeOnTheScreen();
  });

  it('dismisses on a long drag or a fast flick, not on a short drag', () => {
    expect(dismissesOnDrag(81, 0)).toBe(true);
    expect(dismissesOnDrag(80, 0)).toBe(false);
    expect(dismissesOnDrag(0, 0.6)).toBe(true);
    expect(dismissesOnDrag(0, 0.5)).toBe(false);
  });

  it('keeps its sheet and handle reachable by test id', async () => {
    await renderSheet();

    expect(screen.getByTestId('sheet')).toBeOnTheScreen();
    expect(screen.getByTestId('sheet-handle')).toBeOnTheScreen();
  });
});
