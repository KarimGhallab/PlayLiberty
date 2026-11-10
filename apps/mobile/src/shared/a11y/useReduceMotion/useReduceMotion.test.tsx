import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';

import { useReduceMotion } from './useReduceMotion';

function Probe() {
  const reduceMotion = useReduceMotion();

  return <Text testID="reduce-motion">{reduceMotion ? 'on' : 'off'}</Text>;
}

const pending = (): Promise<boolean> => new Promise(() => {});

describe('the reduce-motion hook', () => {
  const read = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled');

  it('starts on until the system answers', async () => {
    read.mockReturnValue(pending());

    await render(<Probe />);

    expect(screen.getByTestId('reduce-motion')).toHaveTextContent('on');
  });

  it('keeps the answer for a later mount', async () => {
    read.mockResolvedValue(false);
    const first = await render(<Probe />);

    await waitFor(() => {
      expect(screen.getByTestId('reduce-motion')).toHaveTextContent('off');
    });
    await first.unmount();

    read.mockReturnValue(pending());
    await render(<Probe />);

    expect(screen.getByTestId('reduce-motion')).toHaveTextContent('off');
  });
});
