import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

import FloatingAction from './FloatingAction';

/* The floating add action's own test: a button whose name is all of it. */

describe('FloatingAction', () => {
  it('names itself for a reader and takes the press', () => {
    const onClick = vi.fn();

    render(<FloatingAction label="Add a playlist" onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'Add a playlist' });

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <FloatingAction label="Add a track" onClick={() => undefined} />
    );

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
