import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

import Chip from './Chip';

function renderChip(props: Partial<Parameters<typeof Chip>[0]> = {}) {
  return render(<Chip label="Failed" count={3} tone="failed" {...props} />);
}

describe('Chip', () => {
  it('names its word and count and reports whether it is in force', () => {
    renderChip({ selected: true });

    const chip = screen.getByRole('button', { name: 'Failed 3' });

    expect(chip).toHaveTextContent('Failed');
    expect(chip).toHaveTextContent('3');
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('reads its word alone when no count is given', () => {
    renderChip({ count: undefined });

    expect(screen.getByRole('button', { name: 'Failed' })).toBeInTheDocument();
  });

  it('calls the press and leaves a disabled chip unreachable', () => {
    const onClick = vi.fn();
    const { rerender } = renderChip({ onClick });

    fireEvent.click(screen.getByRole('button', { name: 'Failed 3' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Chip label="Failed" count={3} tone="failed" disabled onClick={onClick} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Failed 3' }));

    expect(screen.getByRole('button', { name: 'Failed 3' })).toBeDisabled();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has no axe violations', async () => {
    const { container } = renderChip();

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } }
    });
    expect(results.violations).toEqual([]);
  });
});
