import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import VolumeToast from './VolumeToast';

function renderToast(props: Parameters<typeof VolumeToast>[0]) {
  return render(
    <I18nProvider preferred={['en']}>
      <VolumeToast {...props} />
    </I18nProvider>
  );
}

describe('VolumeToast', () => {
  it('announces the level as a sentence, not a bare figure', () => {
    renderToast({ volume: 0.45, muted: false, durationMs: 1600 });

    expect(screen.getByRole('status')).toHaveTextContent('Volume 45 percent');
  });

  it('says the output is muted while the level stands', () => {
    renderToast({ volume: 0.7, muted: true, durationMs: 1600 });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Volume muted, 70 percent'
    );
  });
});
