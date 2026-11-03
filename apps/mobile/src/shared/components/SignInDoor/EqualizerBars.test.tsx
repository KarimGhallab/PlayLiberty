import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { Animated, StyleSheet } from 'react-native';

import EqualizerBars from './EqualizerBars';

jest.mock('../../a11y/useReduceMotion', () => ({
  useReduceMotion: () => false
}));

describe('the sign-in equalizer', () => {
  it('pulses on scaleY from the bottom on the native driver', async () => {
    const timing = jest.spyOn(Animated, 'timing');

    await render(<EqualizerBars busy />);

    expect(timing).toHaveBeenCalled();

    for (const [, config] of timing.mock.calls) {
      expect(config.useNativeDriver).toBe(true);
    }

    const style = StyleSheet.flatten(
      screen.getByTestId('equalizer-bar-0').props.style
    );

    expect(style.height).toBeGreaterThan(0);
    expect(style.transform).toEqual([{ scaleY: expect.anything() }]);
    expect(style.transformOrigin).toBe('bottom');
  });
});
