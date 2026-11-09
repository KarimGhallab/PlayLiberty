import { useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ApiError,
  SYNCING_HOLD_MS,
  ownerNameFrom,
  useAccountDirectory,
  useBulkSync,
  useCreatePlaylist,
  useDeletePlaylist,
  usePlaylists,
  useRenamePlaylist,
  useSyncAllPlaylists,
  useSyncPlaylist,
  useUpdatePin,
  useUpdateSkipNonMusic
} from '@playliberty/api-client';
import type {
  PlaylistWithCounts,
  TrackFilterState
} from '@playliberty/contracts';
import { PlaylistSyncStatus, Provider } from '@playliberty/contracts';
import { problemDetail, useI18n } from '@playliberty/i18n';
import type { LibraryScope, PlaylistActionKey } from '@playliberty/library';
import {
  UNDO_WINDOW_MS,
  canWritePlaylist,
  deleteIntentFor,
  groupPlaylists,
  playlistActionsFor,
  scopedPlaylists,
  statusTotals,
  visiblePlaylists
} from '@playliberty/library';
import { statusCount } from '@playliberty/ui-foundation';

import ActionDial, {
  type DialAction,
  actionDialSize
} from '../../../shared/components/ActionDial/ActionDial';
import Checkbox from '../../../shared/components/Checkbox/Checkbox';
import Notice from '../../../shared/components/Notice/Notice';
import ReadFailure from '../../../shared/components/ReadFailure';
import UndoSnackbar from '../../../shared/components/UndoSnackbar/UndoSnackbar';
import { verticalListChrome } from '../../../shared/components/listChrome';
import {
  fontFamily,
  tokenColor,
  tokenLength,
  tokenWeight
} from '../../../shared/styles/tokens/tokens';
import { useDeferredAction } from '../../../shared/useDeferredAction';

import type { ApiConfig } from '../../../auth/useApiConfig/useApiConfig';
import { usePlayerBarHeight } from '../../../player/playerBarSize/PlayerBarSizeContext';
import { usePlayerStore } from '../../../player/playerStore/playerStore';
import {
  type StartIntent,
  startAtPlaylist
} from '../../../player/startPlayback/startPlayback';
import AddPlaylistSheet from '../AddPlaylistSheet/AddPlaylistSheet';
import CoverSheet from '../CoverSheet/CoverSheet';
import EmptyGallery from '../EmptyGallery';
import GalleryFilterBar from '../GalleryFilterBar';
import GallerySkeleton from '../GallerySkeleton';
import PlaylistActionsSheet from '../PlaylistActionsSheet/PlaylistActionsSheet';
import PlaylistCard from '../PlaylistCard/PlaylistCard';
import RenameSheet from '../RenameSheet/RenameSheet';
import ShareSheet from '../ShareSheet/ShareSheet';
import {
  galleryColumnCount,
  galleryColumnWidth,
  galleryPinnedWidth
} from '../galleryColumns';
import { clampScrollOffset } from './clampScrollOffset';

const LOAD_MORE_DISTANCE = tokenLength('space-9') * 8;

type GalleryRow =
  | {
      readonly kind: 'heading';
      readonly key: string;
      readonly group: 'syncing';
      readonly title: string;
    }
  | {
      readonly kind: 'cards';
      readonly key: string;
      readonly group: 'syncing' | 'rest';
      readonly items: readonly PlaylistWithCounts[];
    };

/* The grid rows are pre-chunked, so one list row is one line of cards. */
function cardRows(
  items: readonly PlaylistWithCounts[],
  columns: number,
  group: 'syncing' | 'rest'
): GalleryRow[] {
  const rows: GalleryRow[] = [];

  for (let start = 0; start < items.length; start += columns) {
    const chunk = items.slice(start, start + columns);

    rows.push({
      kind: 'cards',
      key: chunk[0]?.id ?? `${group}-${start}`,
      group,
      items: chunk
    });
  }

  return rows;
}

/* The card's menu carries the skip setting; the draft keeps its move on the
 * press while the write answers. */
function GallerySkipSetting({
  playlist,
  onError
}: {
  readonly playlist: PlaylistWithCounts;
  readonly onError: (error: Error) => void;
}) {
  const { t } = useI18n();
  const update = useUpdateSkipNonMusic(playlist.id);
  const [draft, setDraft] = useState<boolean | null>(null);

  return (
    <Checkbox
      testID="gallery-skip"
      label={t('skipSetting.label')}
      checked={draft ?? playlist.skipNonMusic}
      disabled={!canWritePlaylist(playlist) || update.isPending}
      onChange={next => {
        setDraft(next);
        update.mutate(next, {
          onError,
          onSettled: () => setDraft(null)
        });
      }}
    />
  );
}

export interface PlaylistGalleryProps {
  readonly config: ApiConfig | null;
  readonly scope: LibraryScope;
  readonly statusFilter: TrackFilterState | null;
  readonly onScopeChange: (scope: LibraryScope) => void;
  readonly onStatusChange: (status: TrackFilterState | null) => void;
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
  const client = useQueryClient();
  const barHeight = usePlayerBarHeight();
  const playerOffset =
    usePlayerStore(state => state.currentId) === null ? 0 : barHeight;
  const playerPlaylistId = usePlayerStore(state => state.playlistId);
  const playerPlaying = usePlayerStore(state => state.isPlaying);
  const playerShuffled = usePlayerStore(state => state.shuffle);
  const setPlaying = usePlayerStore(state => state.setPlaying);
  const setShuffle = usePlayerStore(state => state.setShuffle);
  const window = useWindowDimensions();
  const columns = galleryColumnCount(window.width);
  const columnWidth = galleryColumnWidth(window.width);
  const pinnedCardWidth = galleryPinnedWidth(window.width);
  const pinnedCardGap = tokenLength('space-3');
  /* The first paint mounts the visible cards including the one that peeks, so a
   * row of pinned playlists costs the viewport rather than the library. */
  const pinnedViewportWidth =
    columns * columnWidth + (columns - 1) * pinnedCardGap;
  const pinnedBatch = Math.max(
    2,
    Math.ceil(pinnedViewportWidth / (pinnedCardWidth + pinnedCardGap))
  );
  const playlists = usePlaylists();
  const directory = useAccountDirectory();
  const create = useCreatePlaylist();
  const pin = useUpdatePin();
  const syncNow = useSyncPlaylist();
  const remove = useDeletePlaylist();
  const rename = useRenamePlaylist();
  const deferred = useDeferredAction();
  const [addOpen, setAddOpen] = useState(false);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [actionProblem, setActionProblem] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<PlaylistWithCounts | null>(
    null
  );
  const [renameProblem, setRenameProblem] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<PlaylistWithCounts | null>(
    null
  );
  const [coverTargetId, setCoverTargetId] = useState<string | null>(null);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [starting, setStarting] = useState<{
    readonly playlistId: string;
    readonly intent: StartIntent;
  } | null>(null);
  const createTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinnedRow = useRef<FlatList<PlaylistWithCounts>>(null);
  const pinnedViewport = useRef(0);
  const pinnedOffset = useRef(0);
  const deletingPlaylistId =
    remove.isPending && remove.variables !== undefined
      ? remove.variables
      : null;
  const galleryWindows = deferred.windows.filter(
    window => window.kind === 'gallery-playlist'
  );
  const hidden = new Set(galleryWindows.map(window => window.id));

  if (deletingPlaylistId !== null) {
    hidden.add(deletingPlaylistId);
  }

  const deleteWindow = galleryWindows[0] ?? null;
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
  const { counts: statusCounts, remoteRemoved } = statusTotals(scopedItems);
  const activeCount =
    statusFilter === null
      ? 0
      : statusCount(statusFilter, statusCounts, remoteRemoved);
  const provider = scopedItems[0]?.provider ?? Provider.Youtube;
  const visibleItems = visiblePlaylists(scopedItems, statusFilter);
  const readOnlyCount = visibleItems.filter(
    item => !canWritePlaylist(item)
  ).length;
  const bulk = useBulkSync(
    items,
    playlists.dataUpdatedAt,
    scope,
    statusFilter,
    useSyncAllPlaylists()
  );
  const syncLabel = bulk.busy
    ? t('library.syncingAll', { count: bulk.count })
    : t('library.syncAll', { count: bulk.count });
  /* Add first, the sync nearest the thumb; the sync keeps the accent mark. */
  const dialActions: DialAction[] = [
    {
      key: 'add',
      testID: 'gallery-add',
      label: t('library.add'),
      icon: 'add',
      onPress: () => setAddOpen(true)
    },
    ...(bulk.count === 0
      ? []
      : [
          {
            key: 'sync',
            testID: 'gallery-sync',
            label: syncLabel,
            detail:
              readOnlyCount === 0
                ? undefined
                : t('library.syncAllReadOnly', { count: readOnlyCount }),
            icon: 'sync' as const,
            accent: true,
            busy: bulk.busy,
            onPress: bulk.start
          }
        ])
  ];

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

  const { pinned, syncing, rest } = groupPlaylists(visibleItems);
  const rows: GalleryRow[] = [];

  if (syncing.length > 0) {
    rows.push({
      kind: 'heading',
      key: 'syncing-heading',
      group: 'syncing',
      title: t('library.syncing')
    });
    rows.push(...cardRows(syncing, columns, 'syncing'));
  }

  rows.push(...cardRows(rest, columns, 'rest'));
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

  /* A card's start reads the whole playlist and reports a refusal; the queue it
   * owns is toggled in place instead. */
  const startFrom = (
    playlist: PlaylistWithCounts,
    intent: StartIntent
  ): void => {
    setStarting({ playlistId: playlist.id, intent });
    void startAtPlaylist(client, playlist, intent)
      .then(refusal => {
        if (refusal === null) {
          return;
        }

        setNotice(
          refusal.kind === 'empty'
            ? t('start.empty', { name: playlist.name })
            : t('start.unreachable', { name: playlist.name })
        );
      })
      .finally(() =>
        setStarting(current =>
          current?.playlistId === playlist.id ? null : current
        )
      );
  };

  const playPlaylist = (playlist: PlaylistWithCounts): void => {
    if (playerPlaylistId === playlist.id) {
      setPlaying(!playerPlaying);
      return;
    }

    startFrom(playlist, 'play');
  };

  const shufflePlaylist = (playlist: PlaylistWithCounts): void => {
    if (playerPlaylistId === playlist.id && playerShuffled) {
      setShuffle(false);
      return;
    }

    startFrom(playlist, 'shuffle');
  };
  const cardFor = (playlist: PlaylistWithCounts, groupKey: string) => (
    <PlaylistCard
      playlist={playlist}
      ownerName={ownerNameFrom(directoryItems, playlist.ownerAccountId)}
      config={config}
      onOpen={() => onOpenPlaylist(playlist.id)}
      onOpenActions={() => openActions(playlist.id)}
      onPlay={() => playPlaylist(playlist)}
      onShuffle={() => shufflePlaylist(playlist)}
      starting={starting?.playlistId === playlist.id ? starting.intent : null}
      playing={playerPlaylistId === playlist.id && playerPlaying}
      shuffled={playerPlaylistId === playlist.id && playerShuffled}
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
  const coverTarget =
    coverTargetId === null
      ? null
      : (items.find(item => item.id === coverTargetId) ?? null);
  const actions = actionTarget === null ? [] : playlistActionsFor(actionTarget);

  useEffect(() => {
    return () => {
      if (createTimer.current !== null) {
        clearTimeout(createTimer.current);
      }
    };
  }, []);

  /* One window at a time: a second delete sends the first now rather than
   * losing its request, then opens its own undo window. */
  const startDelete = (target: PlaylistWithCounts): void => {
    const intent = deleteIntentFor(t, target);

    for (const window of deferred.windows) {
      if (window.kind === 'gallery-playlist') {
        deferred.commit(window.key);
      }
    }

    deferred.defer({
      id: intent.id,
      kind: 'gallery-playlist',
      message: intent.message,
      detail: intent.detail,
      commit: () =>
        remove.mutate(intent.id, {
          onError: () => setNotice(t('library.deleteFailed'))
        })
    });
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

    if (key === 'share') {
      setShareTarget(target);
      return;
    }

    if (key === 'cover') {
      setCoverTargetId(target.id);
    }
  };

  const skipControl =
    actionTarget === null ? undefined : (
      <GallerySkipSetting
        key={actionTarget.id}
        playlist={actionTarget}
        onError={error =>
          setActionProblem(problemMessage(error, t('detail.settingFailed')))
        }
      />
    );

  const actionsSheet = (
    <PlaylistActionsSheet
      playlistName={actionTarget?.name ?? null}
      actions={actions}
      problem={actionProblem}
      onSelect={chooseAction}
      extra={skipControl}
      onClose={closeActions}
    />
  );
  const coverSheet = (
    <CoverSheet
      playlist={coverTarget}
      config={config}
      onClose={() => setCoverTargetId(null)}
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
  const shareSheet = (
    <ShareSheet
      visible={shareTarget !== null}
      playlistId={shareTarget?.id ?? null}
      onClose={() => setShareTarget(null)}
    />
  );
  const undoSnackbar =
    deleteWindow === null ? null : (
      <UndoSnackbar
        key={deleteWindow.key}
        message={deleteWindow.message}
        detail={deleteWindow.detail ?? ''}
        onExpire={() => undefined}
        onUndo={() => deferred.cancel(deleteWindow.key)}
        durationMs={UNDO_WINDOW_MS}
        bottomOffset={actionDialSize + tokenLength('space-3') + playerOffset}
        horizontalInset={0}
      />
    );
  const noticeNode =
    notice === null ? null : (
      <Notice
        message={notice}
        onDismiss={() => setNotice(null)}
        horizontalInset={0}
        bottomOffset={
          actionDialSize +
          tokenLength('space-3') +
          playerOffset +
          (deleteWindow === null
            ? 0
            : tokenLength('space-9') + tokenLength('space-4'))
        }
      />
    );
  const bulkNotice =
    bulk.notice === null ? null : (
      <Notice
        message={bulk.notice.message}
        detail={bulk.notice.detail}
        onDismiss={bulk.dismissNotice}
        horizontalInset={0}
        bottomOffset={actionDialSize + tokenLength('space-3') + playerOffset}
      />
    );

  const renderRow = ({ item }: { item: GalleryRow }): ReactElement =>
    item.kind === 'heading' ? (
      <Text
        accessibilityRole="header"
        testID={`gallery-heading-${item.group}`}
        style={styles.heading}>
        {item.title}
      </Text>
    ) : (
      <View style={styles.row}>
        {item.items.map(playlist => (
          <View
            key={playlist.id}
            testID="gallery-cell"
            style={{ width: columnWidth }}>
            {cardFor(playlist, item.group)}
          </View>
        ))}
      </View>
    );

  const pinnedHeader =
    pinned.length === 0 ? null : (
      <View style={styles.pinnedGroup}>
        <Text
          accessibilityRole="header"
          testID="gallery-heading-pinned"
          style={styles.heading}>
          {t('library.pinned')}
        </Text>
        <FlatList
          ref={pinnedRow}
          testID="pinned-row"
          data={pinned}
          keyExtractor={playlist => playlist.id}
          renderItem={({ item }) => (
            <View testID="pinned-card" style={{ width: pinnedCardWidth }}>
              {cardFor(item, 'pinned')}
            </View>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pinnedRow}
          contentContainerStyle={styles.pinnedContent}
          scrollEventThrottle={16}
          initialNumToRender={pinnedBatch}
          maxToRenderPerBatch={pinnedBatch}
          windowSize={3}
          getItemLayout={(_, index) => ({
            length: pinnedCardWidth + pinnedCardGap,
            offset: (pinnedCardWidth + pinnedCardGap) * index,
            index
          })}
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
              pinnedRow.current?.scrollToOffset({
                offset: clamped,
                animated: false
              });
              pinnedOffset.current = clamped;
            }
          }}
        />
      </View>
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
      <View style={styles.filterBar}>
        <GalleryFilterBar
          hasShared={hasShared}
          totalCount={items.length}
          sharedCount={sharedItems.length}
          scope={scope}
          onScopeChange={onScopeChange}
          counts={statusCounts}
          remoteRemoved={remoteRemoved}
          provider={provider}
          activeStatus={statusFilter}
          onStatusChange={onStatusChange}
        />
      </View>
      <FlatList
        testID="gallery-scroll"
        data={rows}
        keyExtractor={row => row.key}
        renderItem={renderRow}
        ListHeaderComponent={pinnedHeader}
        style={styles.gallery}
        {...verticalListChrome}
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
              actionDialSize +
              tokenLength('space-3') +
              playerOffset
          }
        ]}
      />
      <ActionDial
        label={t('library.actions')}
        testID="gallery-actions"
        actions={dialActions}
        busy={bulk.busy}
        bottomOffset={playerOffset}
        rightOffset={tokenLength('space-4')}
      />
      {addSheet}
      {actionsSheet}
      {coverSheet}
      {renameSheet}
      {shareSheet}
      {undoSnackbar}
      {noticeNode}
      {bulkNotice}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1
  },
  /* The gallery runs edge to edge so the pinned row can show its next card;
   * every band inside restores the page inset itself. */
  list: {
    flex: 1,
    gap: tokenLength('space-3'),
    marginHorizontal: -tokenLength('space-4')
  },
  filterBar: {
    paddingHorizontal: tokenLength('space-4')
  },
  gallery: {
    flex: 1
  },
  content: {},
  row: {
    flexDirection: 'row',
    gap: tokenLength('space-3'),
    marginBottom: tokenLength('space-3'),
    paddingHorizontal: tokenLength('space-4')
  },
  pinnedGroup: {
    marginBottom: tokenLength('space-4')
  },
  pinnedRow: {
    flexGrow: 0
  },
  pinnedContent: {
    gap: tokenLength('space-3'),
    paddingLeft: tokenLength('space-4'),
    paddingRight: tokenLength('space-4')
  },
  heading: {
    marginBottom: tokenLength('space-2'),
    paddingHorizontal: tokenLength('space-4'),
    color: tokenColor('ink'),
    fontFamily,
    fontSize: tokenLength('text-md'),
    fontWeight: tokenWeight('weight-semibold')
  }
});
