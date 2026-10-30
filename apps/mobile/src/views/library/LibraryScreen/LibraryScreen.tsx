import { useState } from 'react';

import type { Account, TrackFileStatus } from '@playliberty/contracts';

import LibraryHeader from '../../../shared/components/LibraryHeader/LibraryHeader';
import Notice from '../../../shared/components/Notice/Notice';
import { tokenLength } from '../../../shared/styles/tokens';

import { usePlaylists } from '../../../api/usePlaylists/usePlaylists';
import type { ApiConfig } from '../../../auth/useApiConfig';
import { galleryAddActionSize } from '../GalleryAddAction/GalleryAddAction';
import type { LibraryScope } from '../GalleryFilterBar/GalleryFilterBar';
import PlaylistGallery from '../PlaylistGallery/PlaylistGallery';
import { useBulkSync } from '../bulkSync/bulkSync';

export interface LibraryScreenProps {
  readonly account: Account | null;
  readonly config: ApiConfig | null;
  readonly isAdmin: boolean;
  readonly onOpenAccount: () => void;
  readonly onOpenEgress: () => void;
  readonly onOpenPlaylist: (playlistId: string) => void;
}

/* The library screen: the chrome the bulk sync names, the rail's state it shares
 * with the gallery, and the notice the batch's tally draws. */
export default function LibraryScreen({
  account,
  config,
  isAdmin,
  onOpenAccount,
  onOpenEgress,
  onOpenPlaylist
}: LibraryScreenProps) {
  const playlists = usePlaylists();
  const items = playlists.data?.items ?? [];
  const [scope, setScope] = useState<LibraryScope>('all');
  const [statusFilter, setStatusFilter] = useState<TrackFileStatus | null>(
    null
  );
  const bulk = useBulkSync(items, playlists.dataUpdatedAt, scope, statusFilter);

  return (
    <>
      <LibraryHeader
        account={account}
        isAdmin={isAdmin}
        sync={{ count: bulk.count, busy: bulk.busy, onPress: bulk.start }}
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
      {bulk.notice === null ? null : (
        <Notice
          message={bulk.notice.message}
          detail={bulk.notice.detail}
          onDismiss={bulk.dismissNotice}
          bottomOffset={galleryAddActionSize + tokenLength('space-3')}
        />
      )}
    </>
  );
}
