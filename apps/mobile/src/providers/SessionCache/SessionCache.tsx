import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import {
  SessionStatus,
  useSessionStore
} from '../../auth/sessionStore/sessionStore';

/** Server data belongs to the session that read it: when the session ends, the
 * cache goes, so no collaborator's data survives a handover. */
export default function SessionCache() {
  const queryClient = useQueryClient();
  const status = useSessionStore(state => state.status);

  useEffect(() => {
    if (status === SessionStatus.SignedOut) {
      queryClient.clear();
    }
  }, [queryClient, status]);

  return null;
}
