import { useEffect, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  PlaylistWithCounts,
  TrackFileStatusCounts
} from '@playliberty/contracts';
import { PlaylistSyncStatus, TrackFileStatus } from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';

import Notice from '../../../shared/components/Notice/Notice';
import ReadFailure from '../../../shared/components/ReadFailure/ReadFailure';
import UndoSnackbar from '../../../shared/components/UndoSnackbar/UndoSnackbar';
import {
  fontFamily,
  tokenColor,
  tokenLength
} from '../../../shared/styles/tokens';

import { ApiError } from '../../../api/apiClient/ApiClient';
import {
  ownerNameFrom,
  useAccountDirectory
} from '../../../api/useAccountDirectory';
import {
  SYNCING_HOLD_MS,
  useCreatePlaylist
} from '../../../api/useCreatePlaylist/useCreatePlaylist';
import { useDeletePlaylist } from '../../../api/useDeletePlaylist';
import { usePlaylists } from '../../../api/usePlaylists/usePlaylists';
import { useRenamePlaylist } from '../../../api/useRenamePlaylist';
import { useSyncPlaylist } from '../../../api/useSyncPlaylist';
import { useUpdatePin } from '../../../api/useUpdatePin';
import type { ApiConfig } from '../../../auth/useApiConfig';
import { playerBarHeight } from '../../../player/playerBarSize/playerBarSize';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import AddPlaylistSheet from '../AddPlaylistSheet/AddPlaylistSheet';
import EmptyGallery from '../EmptyGallery/EmptyGallery';
import GalleryAddAction, {
  galleryAddActionSize
} from '../GalleryAddAction/GalleryAddAction';
import type { LibraryScope } from '../GalleryFilterBar/GalleryFilterBar';
import GalleryFilterBar from '../GalleryFilterBar/GalleryFilterBar';
import GallerySkeleton from '../GallerySkeleton/GallerySkeleton';
import PlaylistActionsSheet from '../PlaylistActionsSheet/PlaylistActionsSheet';
import PlaylistCard from '../PlaylistCard/PlaylistCard';
import type { PlaceholderAction } from '../PlaylistPlaceholderSheet/PlaylistPlaceholderSheet';
import PlaylistPlaceholderSheet from '../PlaylistPlaceholderSheet/PlaylistPlaceholderSheet';
import RenameSheet from '../RenameSheet/RenameSheet';
import { scopedPlaylists, visiblePlaylists } from '../bulkSync/bulkSync';
import type {
  DeleteIntent,
  PlaylistActionKey
} from '../playlistActions/playlistActions';
import {
  UNDO_WINDOW_MS,
  deleteIntentFor,
  playlistActionsFor
} from '../playlistActions/playlistActions';
import { clampScrollOffset } from './clampScrollOffset/clampScrollOffset';

const TRACK_STATUSES: readonly TrackFileStatus[] =
  Object.values(TrackFileStatus);

const LOAD_MORE_DISTANCE = tokenLength('space-9') * 8;

/* The chips read the scope they are drawn over: one total per status over every
 * playlist in that scope. */
function totalStatusCounts(
  items: readonly PlaylistWithCounts[]
): TrackFileStatusCounts {
  const totals: TrackFileStatusCounts = {
    [TrackFileStatus.Stored]: 0,
    [TrackFileStatus.Pending]: 0,
    [TrackFileStatus.Downloading]: 0,
    [TrackFileStatus.Failed]: 0,
    [TrackFileStatus.Unavailable]: 0
  };

  for (const item of items) {
    for (const status of TRACK_STATUSES) {
      totals[status] += item.counts[status];
    }
  }

  return totals;
}

export interface PlaylistGalleryProps {
  readonly config: ApiConfig | null;
  readonly scope: LibraryScope;
  readonly statusFilter: TrackFileStatus | null;
  readonly onScopeChange: (scope: LibraryScope) => void;
  readonly onStatusChange: (status: TrackFileStatus | null) => void;
  readonly onOpenPlaylist: (playlistId: string) => void;
}

/* The gallery's groups keep the server's order: a pin outranks a running first
 * sync, so the transient group holds the unpinned rows only. */
export default function PlaylistGallery({
  config,
  scope,
  statusFilter,
  onScopeChange,
  onStatusChange,
  onOpenPlaylist
}: PlaylistGalleryProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const playerOffset =
    usePlayerStore(state => state.currentId) === null ? 0 : playerBarHeight;
  const window = useWindowDimensions();
  const pinnedCardWidth =
    (window.width - tokenLength('space-4') * 2 - tokenLength('space-3')) * 0.45;
  const playlists = usePlaylists();
  const directory = useAccountDirectory();
  const create = useCreatePlaylist();
  const pin = useUpdatePin();
  const syncNow = useSyncPlaylist();
  const remove = useDeletePlaylist();
  const rename = useRenamePlaylist();
  const [addOpen, setAddOpen] = useState(false);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [actionProblem, setActionProblem] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<PlaylistWithCounts | null>(
    null
  );
  const [renameProblem, setRenameProblem] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState<{
    readonly action: PlaceholderAction;
    readonly name: string;
  } | null>(null);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const [pendingDelete, setPendingDelete] = useState<DeleteIntent | null>(null);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinnedRow = useRef<ScrollView>(null);
  const pinnedViewport = useRef(0);
  const pinnedOffset = useRef(0);
  const loadedItems = (playlists.data?.items ?? []).filter(
    item => !hidden.has(item.id)
  );
  /* A just-created row reads as syncing even if the server's quick reconcile
   * has already finished by the time the gallery reads it. */
  const items =
    justCreatedId === null
      ? loadedItems
      : loadedItems.map(item =>
          item.id === justCreatedId
            ? { ...item, syncStatus: PlaylistSyncStatus.Syncing }
            : item
        );
  const directoryItems = directory.data ?? [];
  const sharedItems = items.filter(item => item.access !== 'owner');
  const hasShared = sharedItems.length > 0;
  const scopedItems = scopedPlaylists(items, scope);
  const statusCounts = totalStatusCounts(scopedItems);
  const activeCount = statusFilter === null ? 0 : statusCounts[statusFilter];
  const visibleItems = visiblePlaylists(scopedItems, statusFilter);

  /* A status the scope no longer carries cannot stay in force; a live read that
   * drops the last track in it returns the rail to All. */
  useEffect(() => {
    if (statusFilter !== null && activeCount === 0) {
      onStatusChange(null);
    }
  }, [statusFilter, activeCount, onStatusChange]);

  /* The scope cannot outlive the last share: its pair leaves the rail. */
  useEffect(() => {
    if (scope === 'shared' && !hasShared) {
      onScopeChange('all');
    }
  }, [scope, hasShared, onScopeChange]);

  const pinned = visibleItems.filter(item => item.pinned);
  const unpinned = visibleItems.filter(item => !item.pinned);
  const syncing = unpinned.filter(
    item => item.syncStatus === PlaylistSyncStatus.Syncing
  );
  const rest = unpinned.filter(
    item => item.syncStatus !== PlaylistSyncStatus.Syncing
  );
  const groups = [
    { key: 'pinned', heading: t('library.pinned'), items: pinned },
    { key: 'syncing', heading: t('library.syncing'), items: syncing },
    { key: 'rest', heading: null, items: rest }
  ].filter(group => group.items.length > 0);
  const failureMessage =
    problemDetail(
      t,
      playlists.error instanceof ApiError ? playlists.error.problem : null
    ) ?? t('library.readFailed');
  const createProblem = problemDetail(
    t,
    create.error instanceof ApiError ? create.error.problem : null
  );
  const loadMore = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    if (!playlists.hasNextPage || playlists.isFetchingNextPage) {
      return;
    }

    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const nearBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - LOAD_MORE_DISTANCE;

    if (nearBottom) {
      void playlists.fetchNextPage();
    }
  };
  const cardFor = (playlist: PlaylistWithCounts, groupKey: string) => (
    <PlaylistCard
      playlist={playlist}
      ownerName={ownerNameFrom(directoryItems, playlist.ownerAccountId)}
      config={config}
      onOpen={() => onOpenPlaylist(playlist.id)}
      onOpenActions={() => openActions(playlist.id)}
      actionsTestID={`playlist-actions-${groupKey}`}
    />
  );

  /* The server accepts the link by starting the sync, so the sheet closes and
   * the new row reads as syncing until its own read replaces the flag. */
  useEffect(() => {
    if (!create.isSuccess) {
      return;
    }

    const createdId = create.data?.playlistId;

    if (createdId !== undefined) {
      setJustCreatedId(createdId);

      if (createTimer.current !== null) {
        clearTimeout(createTimer.current);
      }

      createTimer.current = setTimeout(() => {
        setJustCreatedId(null);
        createTimer.current = null;
      }, SYNCING_HOLD_MS);
    }

    setAddOpen(false);
    create.reset();
  }, [create.data, create.isSuccess, create.reset]);

  const addSheet = (
    <AddPlaylistSheet
      visible={addOpen}
      busy={create.isPending}
      problem={createProblem}
      onSubmit={(url, skipNonMusic) => {
        create.mutate({ url, skipNonMusic });
      }}
      onClose={() => {
        setAddOpen(false);
        create.reset();
      }}
    />
  );
  const actionTarget =
    actionTargetId === null
      ? null
      : (items.find(item => item.id === actionTargetId) ?? null);
  const actions = actionTarget === null ? [] : playlistActionsFor(actionTarget);

  useEffect(() => {
    return () => {
      if (deleteTimer.current !== null) {
        clearTimeout(deleteTimer.current);
      }

      if (createTimer.current !== null) {
        clearTimeout(createTimer.current);
      }
    };
  }, []);

  const commitDelete = (intent: DeleteIntent): void => {
    remove.mutate(intent.id, {
      onError: () => {
        setHidden(previous => {
          const next = new Set(previous);
          next.delete(intent.id);
          return next;
        });
        setNotice(t('library.deleteFailed'));
      }
    });
  };

  const undoDelete = (): void => {
    if (deleteTimer.current !== null) {
      clearTimeout(deleteTimer.current);
      deleteTimer.current = null;
    }

    if (pendingDelete !== null) {
      setHidden(previous => {
        const next = new Set(previous);
        next.delete(pendingDelete.id);
        return next;
      });
    }

    setPendingDelete(null);
  };

  /* One window at a time: a second delete sends the first now rather than
   * losing its request, then opens its own undo window. */
  const startDelete = (target: PlaylistWithCounts): void => {
    if (pendingDelete !== null) {
      if (deleteTimer.current !== null) {
        clearTimeout(deleteTimer.current);
        deleteTimer.current = null;
      }

      commitDelete(pendingDelete);
    }

    const intent = deleteIntentFor(t, target);

    setHidden(previous => new Set(previous).add(target.id));
    setPendingDelete(intent);
    deleteTimer.current = setTimeout(() => {
      commitDelete(intent);
      setPendingDelete(null);
      deleteTimer.current = null;
    }, UNDO_WINDOW_MS);
  };

  const openActions = (playlistId: string): void => {
    setActionProblem(null);
    setActionTargetId(playlistId);
  };

  const closeActions = (): void => {
    setActionTargetId(null);
    setActionProblem(null);
  };

  const problemMessage = (error: Error, fallback: string): string =>
    problemDetail(t, error instanceof ApiError ? error.problem : null) ??
    fallback;

  const chooseAction = (key: PlaylistActionKey): void => {
    const target = actionTarget;

    if (target === null) {
      closeActions();
      return;
    }

    if (key === 'pin') {
      pin.mutate(
        { playlistId: target.id, pinned: !target.pinned },
        {
          onSuccess: closeActions,
          onError: error =>
            setActionProblem(problemMessage(error, t('library.pinFailed')))
        }
      );
      return;
    }

    if (key === 'sync') {
      syncNow.mutate(target.id, {
        onSuccess: closeActions,
        onError: error =>
          setActionProblem(problemMessage(error, t('library.syncFailed')))
      });
      return;
    }

    closeActions();

    if (key === 'delete') {
      startDelete(target);
      return;
    }

    if (key === 'rename') {
      setRenameProblem(null);
      rename.reset();
      setRenameTarget(target);
      return;
    }

    setPlaceholder({ action: key, name: target.name });
  };

  const actionsSheet = (
    <PlaylistActionsSheet
      playlistName={actionTarget?.name ?? null}
      actions={actions}
      problem={actionProblem}
      onSelect={chooseAction}
      onClose={closeActions}
    />
  );
  const placeholderSheet = (
    <PlaylistPlaceholderSheet
      action={placeholder?.action ?? null}
      playlistName={placeholder?.name ?? ''}
      onClose={() => setPlaceholder(null)}
    />
  );
  const renameSheet = (
    <RenameSheet
      visible={renameTarget !== null}
      currentName={renameTarget?.name ?? ''}
      busy={rename.isPending}
      problem={renameProblem}
      onSubmit={name => {
        if (renameTarget === null) {
          return;
        }

        rename.mutate(
          { playlistId: renameTarget.id, name },
          {
            onSuccess: () => {
              setRenameTarget(null);
              setRenameProblem(null);
            },
            onError: error => {
              setRenameProblem(problemMessage(error, t('renameDialog.failed')));
            }
          }
        );
      }}
      onClose={() => {
        setRenameTarget(null);
        setRenameProblem(null);
        rename.reset();
      }}
    />
  );
  const undoSnackbar =
    pendingDelete === null ? null : (
      <UndoSnackbar
        key={pendingDelete.id}
        message={pendingDelete.message}
        detail={pendingDelete.detail}
        onUndo={undoDelete}
        durationMs={UNDO_WINDOW_MS}
        bottomOffset={
          galleryAddActionSize + tokenLength('space-3') + playerOffset
        }
      />
    );
  const noticeNode =
    notice === null ? null : (
      <Notice
        message={notice}
        onDismiss={() => setNotice(null)}
        bottomOffset={
          galleryAddActionSize +
          tokenLength('space-3') +
          playerOffset +
          (pendingDelete === null
            ? 0
            : tokenLength('space-9') + tokenLength('space-4'))
        }
      />
    );

  if (playlists.isPending) {
    return (
      <View
        style={[
          styles.state,
          { paddingBottom: insets.bottom + tokenLength('space-4') }
        ]}>
        <GallerySkeleton />
      </View>
    );
  }

  if (playlists.isError) {
    return (
      <View
        style={[
          styles.state,
          { paddingBottom: insets.bottom + tokenLength('space-4') }
        ]}>
        <ReadFailure
          message={failureMessage}
          retrying={playlists.isFetching}
          onRetry={() => {
            void playlists.refetch();
          }}
        />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <View
          style={[
            styles.state,
            { paddingBottom: insets.bottom + tokenLength('space-4') }
          ]}>
          <EmptyGallery onAdd={() => setAddOpen(true)} />
        </View>
        {addSheet}
        {undoSnackbar}
        {noticeNode}
      </>
    );
  }

  return (
    <View style={styles.list}>
      <GalleryFilterBar
        hasShared={hasShared}
        totalCount={items.length}
        sharedCount={sharedItems.length}
        scope={scope}
        onScopeChange={onScopeChange}
        counts={statusCounts}
        activeStatus={statusFilter}
        onStatusChange={onStatusChange}
      />
      <ScrollView
        testID="gallery-scroll"
        style={styles.gallery}
        refreshControl={
          <RefreshControl
            testID="gallery-refresh"
            refreshing={playlists.isRefetching}
            onRefresh={() => {
              void playlists.refetch();
            }}
            tintColor={tokenColor('ink')}
            colors={[tokenColor('accent')]}
          />
        }
        onScroll={loadMore}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              insets.bottom +
              tokenLength('space-4') +
              galleryAddActionSize +
              tokenLength('space-3') +
              playerOffset
          }
        ]}>
        {groups.map(group => (
          <View key={group.key} style={styles.group}>
            {group.heading === null ? null : (
              <Text
                accessibilityRole="header"
                testID={`gallery-heading-${group.key}`}
                style={styles.heading}>
                {group.heading}
              </Text>
            )}
            {group.key === 'pinned' ? (
              <ScrollView
                ref={pinnedRow}
                testID="pinned-row"
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.pinnedRow}
                contentContainerStyle={styles.pinnedContent}
                scrollEventThrottle={16}
                onLayout={event => {
                  pinnedViewport.current = event.nativeEvent.layout.width;
                }}
                onScroll={event => {
                  pinnedOffset.current = event.nativeEvent.contentOffset.x;
                }}
                onContentSizeChange={width => {
                  const viewport =
                    pinnedViewport.current === 0
                      ? window.width
                      : pinnedViewport.current;
                  const clamped = clampScrollOffset(
                    pinnedOffset.current,
                    width,
                    viewport
                  );

                  if (clamped !== pinnedOffset.current) {
                    pinnedRow.current?.scrollTo({
                      x: clamped,
                      animated: false
                    });
                    pinnedOffset.current = clamped;
                  }
                }}>
                {group.items.map(playlist => (
                  <View key={playlist.id} style={{ width: pinnedCardWidth }}>
                    {cardFor(playlist, group.key)}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.grid}>
                {group.items.map(playlist => (
                  <View key={playlist.id} style={styles.cell}>
                    {cardFor(playlist, group.key)}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <GalleryAddAction
        label={t('library.add')}
        bottomOffset={playerOffset}
        onPress={() => setAddOpen(true)}
      />
      {addSheet}
      {actionsSheet}
      {placeholderSheet}
      {renameSheet}
      {undoSnackbar}
      {noticeNode}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1
  },
  list: {
    flex: 1,
    gap: tokenLength('space-3')
  },
  gallery: {
    flex: 1
  },
  content: {
    gap: tokenLength('space-4')
  },
  group: {
    gap: tokenLength('space-2')
  },
  pinnedRow: {
    flexGrow: 0
  },
  pinnedContent: {
    gap: tokenLength('space-3'),
    paddingRight: tokenLength('space-4')
  },
  heading: {
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: '600'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokenLength('space-3')
  },
  cell: {
    width: '48%'
  }
});
