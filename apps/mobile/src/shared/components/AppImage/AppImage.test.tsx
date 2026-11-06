import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import AppImage from './AppImage';

describe('the shared image', () => {
  it('resizes the decode to the drawn bounds', async () => {
    await render(
      <AppImage
        testID="image"
        source={{ uri: 'https://instance.test/a.jpg' }}
        style={{ width: 56, height: 56 }}
      />
    );

    expect(screen.getByTestId('image').props.resizeMethod).toBe('resize');
  });

  it('keeps the natural pixels when asked', async () => {
    await render(
      <AppImage
        testID="image"
        natural
        source={{ uri: 'https://instance.test/a.jpg' }}
        style={{ width: 56, height: 56 }}
      />
    );

    expect(screen.getByTestId('image').props.resizeMethod).toBeUndefined();
  });
});
