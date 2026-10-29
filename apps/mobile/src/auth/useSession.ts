import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { SessionStatus, useSessionStore } from './sessionStore/sessionStore';

export { SessionStatus };

export interface Session {
  readonly status: SessionStatus;
  readonly refresh: () => void;
}

/** Whether the app holds a token. It re-reads whenever the screen regains
 * focus, so the callback's write is seen on the way back. */
export function useSession(): Session {
  const status = useSessionStore(state => state.status);
  const read = useSessionStore(state => state.refresh);

  useFocusEffect(
    useCallback(() => {
      void read();
    }, [read])
  );

  const refresh = useCallback(() => {
    void read();
  }, [read]);

  return { status, refresh };
}
