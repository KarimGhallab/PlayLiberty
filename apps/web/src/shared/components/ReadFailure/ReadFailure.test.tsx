import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

describe('ReadFailure', () => {
  it('shows the fallback sentence for an error that is not an ApiError', () => {
    render(
      <ReadFailure
        message={FALLBACK}
        error={new Error('boom')}
        onRetry={() => undefined}
      />
    );

    expect(screen.getByText(FALLBACK)).toBeInTheDocument();
  });

  it('shows the fallback sentence for an ApiError with no detail', () => {
    render(
      <ReadFailure
        message={FALLBACK}
        error={apiError(null)}
        onRetry={() => undefined}
      />
    );

    expect(screen.getByText(FALLBACK)).toBeInTheDocument();
  });

  it("shows the server's own detail when the ApiError carries one", () => {
    render(
      <ReadFailure
        message={FALLBACK}
        error={apiError('The library is unavailable.')}
        onRetry={() => undefined}
      />
    );

    expect(screen.getByText('The library is unavailable.')).toBeInTheDocument();
    expect(screen.queryByText(FALLBACK)).not.toBeInTheDocument();
  });

  it('retries through a labelled button', () => {
    const onRetry = vi.fn();
    render(
      <ReadFailure
        message={FALLBACK}
        error={apiError(null)}
        onRetry={onRetry}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('locks the retry while it works', () => {
    render(
      <ReadFailure
        message={FALLBACK}
        error={apiError(null)}
        onRetry={() => undefined}
        retrying
      />
    );

    expect(screen.getByRole('button', { name: 'Trying again' })).toBeDisabled();
  });
});
