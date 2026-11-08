import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProblemCode } from '@playliberty/contracts';
import { I18nProvider } from '@playliberty/i18n';

import { ApiError } from '@playliberty/api-client';
import ReadFailure from './ReadFailure';

/*
 * The recovery surface's own contract: the fallback sentence when the error
 * carries no mapped sentence, and the one retry. The mapping is tested there.
 */

const FALLBACK = 'Playlists could not be loaded.';

function apiError(detail: string | null): ApiError {
  return new ApiError(503, {
    type: 'about:blank',
    title: 'Service unavailable',
    status: 503,
    code: ProblemCode.InternalError,
    detail: detail ?? undefined
  });
}

function renderFailure(props: Partial<Parameters<typeof ReadFailure>[0]> = {}) {
  return render(
    <I18nProvider preferred={['en']}>
      <ReadFailure
        message={FALLBACK}
        error={new Error('boom')}
        onRetry={() => undefined}
        {...props}
      />
    </I18nProvider>
  );
}

describe('ReadFailure', () => {
  it('shows the fallback sentence for an error that is not an ApiError', () => {
    renderFailure();

    expect(screen.getByText(FALLBACK)).toBeInTheDocument();
  });

  it('retries through a labelled button', () => {
    const onRetry = vi.fn();
    renderFailure({ error: apiError(null), onRetry });

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('locks the retry while it works', () => {
    renderFailure({ error: apiError(null), retrying: true });

    expect(screen.getByRole('button', { name: 'Trying again' })).toBeDisabled();
  });
});
