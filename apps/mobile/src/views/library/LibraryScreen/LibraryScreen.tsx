import { useState } from 'react';

import type { Account, TrackFilterState } from '@playliberty/contracts';

import LibraryHeader from '../../../shared/components/LibraryHeader/LibraryHeader';

import type { ApiConfig } from '../../../auth/useApiConfig';
import type { LibraryScope } from '../GalleryFilterBar/GalleryFilterBar';
import PlaylistGallery from '../PlaylistGallery/PlaylistGallery';

export interface LibraryScreenProps {
  readonly account: Account | null;
  readonly config: ApiConfig | null;
  readonly isAdmin: boolean;
  readonly onOpenAccount: () => void;
  readonly onOpenEgress: () => void;
  readonly onOpenPlaylist: (playlistId: string) => void;
}

/* The library screen: the chrome over the gallery and the rail's state it shares
 * with it. */
export default function LibraryScreen({
  account,
  config,
  isAdmin,
  onOpenAccount,
  onOpenEgress,
  onOpenPlaylist
}: LibraryScreenProps) {
  const [scope, setScope] = useState<LibraryScope>('all');
  const [statusFilter, setStatusFilter] = useState<TrackFilterState | null>(
    null
  );

  return (
    <>
      <LibraryHeader
        account={account}
        isAdmin={isAdmin}
        onOpenAccount={onOpenAccount}
        onOpenEgress={onOpenEgress}
      />
      <PlaylistGallery
        config={config}
        scope={scope}
        statusFilter={statusFilter}
        onScopeChange={setScope}
        onStatusChange={setStatusFilter}
        onOpenPlaylist={onOpenPlaylist}
      />
    </>
  );
}
