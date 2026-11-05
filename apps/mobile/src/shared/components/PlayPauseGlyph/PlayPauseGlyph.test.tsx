import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import { createRef } from 'react';
import { AccessibilityInfo, Animated } from 'react-native';

import PlayPauseGlyph, { type PlayPauseGlyphHandle } from './PlayPauseGlyph';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the play/pause glyph', () => {
  it('starts the morph on request, and does not start it twice', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);

    const timing = jest.spyOn(Animated, 'timing');
    const glyph = createRef<PlayPauseGlyphHandle>();
    const view = await render(
      <PlayPauseGlyph ref={glyph} playing={false} size={24} color="#ffffff" />
    );

    await act(async () => {});

    await act(() => {
      glyph.current?.morphTo(true);
    });

    expect(timing).toHaveBeenCalledTimes(1);

    await act(() => {
      view.rerender(
        <PlayPauseGlyph ref={glyph} playing size={24} color="#ffffff" />
      );
    });

    expect(timing).toHaveBeenCalledTimes(1);

    await act(() => {
      view.unmount();
    });
  });
});
