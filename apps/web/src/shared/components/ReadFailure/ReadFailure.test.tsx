import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '@playliberty/i18n';

import { ApiError } from '../../api/client/client';
import ReadFailure from './ReadFailure';

/*
 * The recovery surface's contract: the fallback sentence when the error carries
 * no detail, the server's own detail when it does, and the one retry that names
 * itself and locks while it works.
 */

const FALLBACK = 'Playlists could not be loaded.';

function apiError(detail: string | null): ApiError {
  return new ApiError(503, {
    type: 'about:blank',
    title: 'Service unavailable',
    status: 503,
    code: 'service_unavailable',
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

  it('shows the fallback sentence for an ApiError with no detail', () => {
    renderFailure({ error: apiError(null) });

    expect(screen.getByText(FALLBACK)).toBeInTheDocument();
  });

  it("shows the server's own detail when the ApiError carries one", () => {
    renderFailure({ error: apiError('The library is unavailable.') });

    expect(screen.getByText('The library is unavailable.')).toBeInTheDocument();
    expect(screen.queryByText(FALLBACK)).not.toBeInTheDocument();
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
