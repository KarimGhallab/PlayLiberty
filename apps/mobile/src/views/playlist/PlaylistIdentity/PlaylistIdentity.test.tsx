import { describe, expect, it } from '@jest/globals';

import { narrowControlBoxes } from './PlaylistIdentity';

describe('the compact header', () => {
  it('keeps both targets at 48dp and disjoint', () => {
    for (const width of [320, 390, 430]) {
      const boxes = narrowControlBoxes(width);
      const shuffle = {
        start: boxes.shuffle.left - boxes.shuffle.hit,
        end: boxes.shuffle.left + boxes.shuffle.size + boxes.shuffle.hit
      };
      const actions = {
        start: boxes.actions.left - boxes.actions.hit,
        end: boxes.actions.left + boxes.actions.size + boxes.actions.hit
      };

      expect(shuffle.end - shuffle.start).toBe(48);
      expect(actions.end - actions.start).toBe(48);
      expect(shuffle.end).toBeLessThanOrEqual(actions.start);
    }
  });
});
