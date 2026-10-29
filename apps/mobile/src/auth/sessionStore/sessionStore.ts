import { create } from 'zustand';

import { tokenStore } from '../tokenStore';

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

/* The token is the only thing that says who is here, so a read started before a
 * sign-out must not resurrect the session. Hence the generation. */
let generation = 0;

export const useSessionStore = create<SessionState>()(set => ({
  status: SessionStatus.Loading,
  refresh: async () => {
    const mine = (generation += 1);
    const token = await tokenStore.read();

    if (mine !== generation) {
      return;
    }

    set({
      status: token === null ? SessionStatus.SignedOut : SessionStatus.SignedIn
    });
  },
  expire: async () => {
    generation += 1;
    await tokenStore.clear();
    set({ status: SessionStatus.SignedOut });
  }
}));
