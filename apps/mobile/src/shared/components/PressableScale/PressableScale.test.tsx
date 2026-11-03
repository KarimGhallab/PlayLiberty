import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import PressableScale from './PressableScale';

describe('the pressable scale', () => {
  it('presses and reports the press', async () => {
    const onPress = jest.fn();

    await render(
      <PressableScale testID="pressable" onPress={onPress}>
        <Text>Play</Text>
      </PressableScale>
    );

    await fireEvent.press(screen.getByTestId('pressable'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
