import { create } from 'zustand';

import { usePlayerStore } from '../../player/playerStore/playerStore';
import { mobileSession } from '../session/session';

export enum SessionStatus {
  Loading = 'loading',
  SignedOut = 'signed-out',
  SignedIn = 'signed-in'
}

export interface SessionState {
  readonly status: SessionStatus;
  refresh: () => Promise<void>;
  expire: () => Promise<void>;
}

/* A read started before a sign-out must not resurrect the session, so the
 * status only moves for the generation that started the read. */
let generation = 0;

export const useSessionStore = create<SessionState>()(set => ({
  status: SessionStatus.Loading,
  refresh: async () => {
    const mine = (generation += 1);
    const record = await mobileSession.load();

    if (mine !== generation) {
      return;
    }

    set({
      status: record === null ? SessionStatus.SignedOut : SessionStatus.SignedIn
    });
  },
  expire: async () => {
    generation += 1;
    await mobileSession.clear();
    usePlayerStore.getState().clear();
    set({ status: SessionStatus.SignedOut });
  }
}));

/* A renewal refused anywhere in the app ends the session, not only on a screen
 * that happened to call refresh. */
mobileSession.subscribe(record => {
  useSessionStore.setState({
    status: record === null ? SessionStatus.SignedOut : SessionStatus.SignedIn
  });
});
