import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

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

/** Whether the app holds a token. It re-reads whenever the screen regains
 * focus, so the callback's write is seen on the way back. */
export function useSession(): Session {
  const [status, setStatus] = useState(SessionStatus.Loading);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      setStatus(SessionStatus.Loading);
      void tokenStore.read().then(token => {
        if (active) {
          setStatus(
            token === null ? SessionStatus.SignedOut : SessionStatus.SignedIn
          );
        }
      });

      return () => {
        active = false;
      };
    }, [attempt])
  );

  const refresh = useCallback(() => {
    setAttempt(value => value + 1);
  }, []);

  return { status, refresh };
}
