import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import ShelfSleeves from './ShelfSleeves';

describe('the shelf sleeves', () => {
  it('keeps the art out of the accessibility tree', async () => {
    await render(<ShelfSleeves busy={false} />);

    const art = screen.getAllByTestId('shelf-art');

    expect(art).toHaveLength(3);

    for (const image of art) {
      expect(image.props.accessible).toBe(false);
    }
  });
});
