import { useCallback, useEffect, useState } from 'react';

import { tokenStore } from './tokenStore';

export enum SessionStatus {
  Loading = 'loading',
  SignedOut = 'signed-out',
  SignedIn = 'signed-in'
}

export interface Session {
  readonly status: SessionStatus;
  readonly refresh: () => void;
}

/** Whether the app holds a token. Provisioning is spec `20`'s; this only reads. */
export function useSession(): Session {
  const [status, setStatus] = useState(SessionStatus.Loading);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    void tokenStore.read().then(token => {
      if (!active) {
        return;
      }

      setStatus(
        token === null ? SessionStatus.SignedOut : SessionStatus.SignedIn
      );
    });

    return () => {
      active = false;
    };
  }, [attempt]);

  const refresh = useCallback(() => {
    setStatus(SessionStatus.Loading);
    setAttempt(value => value + 1);
  }, []);

  return { status, refresh };
}
