import { describe, expect, it } from 'vitest';

import type { Playlist } from '@playliberty/contracts';
import { ShareLevel } from '@playliberty/contracts';

import { ShareMarkState, shareMarkOf } from './shareMark.js';

function playlist(
  values: Pick<Playlist, 'access' | 'hasShares'>
): Pick<Playlist, 'access' | 'hasShares'> {
  return values;
}

describe('shareMarkOf', () => {
  it('marks a playlist the account does not own as a collaborator', () => {
    expect(
      shareMarkOf(playlist({ access: ShareLevel.Read, hasShares: false }))
    ).toEqual({ state: ShareMarkState.Collab, label: 'header.collab' });
    expect(
      shareMarkOf(playlist({ access: ShareLevel.Write, hasShares: true }))
    ).toEqual({ state: ShareMarkState.Collab, label: 'header.collab' });
  });

  it('marks an owned playlist with shares as shared', () => {
    expect(
      shareMarkOf(playlist({ access: 'owner', hasShares: true }))
    ).toEqual({ state: ShareMarkState.OwnShared, label: 'header.shared' });
  });

  it('marks an owned playlist without shares as private', () => {
    expect(
      shareMarkOf(playlist({ access: 'owner', hasShares: false }))
    ).toEqual({ state: ShareMarkState.OwnPrivate, label: 'header.private' });
  });
});
