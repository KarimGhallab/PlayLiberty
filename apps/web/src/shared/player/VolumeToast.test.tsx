import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import VolumeToast from './VolumeToast';

describe('VolumeToast', () => {
  it('announces the level as a sentence, not a bare figure', () => {
    render(<VolumeToast volume={0.45} muted={false} durationMs={1600} />);

    expect(screen.getByRole('status')).toHaveTextContent('Volume 45 percent');
  });

  it('says the output is muted while the level stands', () => {
    render(<VolumeToast volume={0.7} muted durationMs={1600} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Volume muted, 70 percent'
    );
  });
});
