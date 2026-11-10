import { useSessionStore } from './sessionStore/sessionStore';

/** The one answer to a credential the app no longer holds. */
export function endRefusedSession(): void {
  void useSessionStore.getState().expire();
}
