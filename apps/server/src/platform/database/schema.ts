import { randomUUID } from 'node:crypto';

import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex
} from 'drizzle-orm/sqlite-core';

import {
  AssociationOrigin,
  PlaylistSort,
  PlaylistSyncStatus,
  Provider,
  ShareLevel,
  SyncRunStatus,
  TrackFileStatus,
  TrackSourceStatus,
  UserRole
} from '@playliberty/contracts';

const createdAt = (): string => new Date().toISOString();

export const accounts = sqliteTable('account', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  pangolinUserId: text('pangolin_user_id').notNull().unique(),
  displayName: text('display_name').notNull(),
  email: text('email'),
  avatarUrl: text('avatar_url'),
  role: text('role').$type<UserRole>().notNull(),
  createdAt: text('created_at').notNull().$defaultFn(createdAt),
  updatedAt: text('updated_at').notNull().$defaultFn(createdAt)
});

export const playlists = sqliteTable(
  'playlist',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    ownerAccountId: text('owner_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    provider: text('provider').$type<Provider>().notNull(),
    sourcePlaylistId: text('source_playlist_id').notNull(),
    sourceUrl: text('source_url'),
    syncStatus: text('sync_status')
      .$type<PlaylistSyncStatus>()
      .notNull()
      .default(PlaylistSyncStatus.Idle),
    skipNonMusic: integer('skip_non_music', { mode: 'boolean' })
      .notNull()
      .default(true),
    sort: text('sort').$type<PlaylistSort>(),
    lastSyncedAt: text('last_synced_at'),
    trackCount: integer('track_count').notNull().default(0),
    createdAt: text('created_at').notNull().$defaultFn(createdAt),
    updatedAt: text('updated_at').notNull().$defaultFn(createdAt)
  },
  table => [
    uniqueIndex('playlist_source_unique').on(
      table.ownerAccountId,
      table.provider,
      table.sourcePlaylistId
    ),
    index('playlist_owner_idx').on(table.ownerAccountId)
  ]
);

export const tracks = sqliteTable(
  'track',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    provider: text('provider').$type<Provider>().notNull(),
    videoId: text('video_id').notNull().unique(),
    title: text('title').notNull(),
    durationSeconds: integer('duration_seconds'),
    skipNonMusic: integer('skip_non_music', { mode: 'boolean' })
      .notNull()
      .default(true),
    thumbnailPath: text('thumbnail_path'),
    thumbnailUrl: text('thumbnail_url'),
    fileStatus: text('file_status')
      .$type<TrackFileStatus>()
      .notNull()
      .default(TrackFileStatus.Pending),
    sourceStatus: text('source_status')
      .$type<TrackSourceStatus>()
      .notNull()
      .default(TrackSourceStatus.Available),
    filePath: text('file_path'),
    failureReason: text('failure_reason'),
    createdAt: text('created_at').notNull().$defaultFn(createdAt),
    updatedAt: text('updated_at').notNull().$defaultFn(createdAt)
  },
  table => [index('track_file_status_idx').on(table.fileStatus)]
);

export const associations = sqliteTable(
  'association',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    playlistId: text('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    trackId: text('track_id')
      .notNull()
      .references(() => tracks.id, { onDelete: 'cascade' }),
    origin: text('origin').$type<AssociationOrigin>().notNull(),
    position: integer('position').notNull(),
    addedAt: text('added_at').notNull().$defaultFn(createdAt)
  },
  table => [
    uniqueIndex('association_playlist_track_unique').on(
      table.playlistId,
      table.trackId
    ),
    index('association_playlist_idx').on(table.playlistId),
    index('association_track_idx').on(table.trackId)
  ]
);

export const suppressions = sqliteTable(
  'suppression',
  {
    playlistId: text('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    videoId: text('video_id').notNull(),
    removedAt: text('removed_at').notNull().$defaultFn(createdAt)
  },
  table => [primaryKey({ columns: [table.playlistId, table.videoId] })]
);

export const shares = sqliteTable(
  'share',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    playlistId: text('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    level: text('level').$type<ShareLevel>().notNull(),
    createdAt: text('created_at').notNull().$defaultFn(createdAt)
  },
  table => [
    uniqueIndex('share_playlist_account_unique').on(
      table.playlistId,
      table.accountId
    ),
    index('share_account_idx').on(table.accountId)
  ]
);

/*
 * An account's placement of a playlist in its own gallery. The pair is the key
 * and the row's existence is the pin, so pinning refreshes `pinned_at` rather
 * than inserting a second row and unpinning deletes it. It follows the share and
 * the suppression and not the playlist: created and deleted, never edited, so it
 * carries no update timestamp. Both foreign keys cascade, and the account index
 * serves the order the section is read in.
 */
export const playlistPins = sqliteTable(
  'playlist_pin',
  {
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    playlistId: text('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    pinnedAt: text('pinned_at').notNull().$defaultFn(createdAt)
  },
  table => [
    primaryKey({ columns: [table.accountId, table.playlistId] }),
    index('playlist_pin_account_idx').on(table.accountId, table.pinnedAt)
  ]
);

export const syncRuns = sqliteTable(
  'sync_run',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    playlistId: text('playlist_id')
      .notNull()
      .references(() => playlists.id, { onDelete: 'cascade' }),
    status: text('status').$type<SyncRunStatus>().notNull(),
    addedCount: integer('added_count').notNull().default(0),
    retainedCount: integer('retained_count').notNull().default(0),
    removedCount: integer('removed_count').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    startedAt: text('started_at').notNull().$defaultFn(createdAt),
    finishedAt: text('finished_at'),
    error: text('error')
  },
  table => [index('sync_run_playlist_idx').on(table.playlistId)]
);

export type AccountRow = typeof accounts.$inferSelect;
export type PlaylistRow = typeof playlists.$inferSelect;
export type TrackRow = typeof tracks.$inferSelect;
export type AssociationRow = typeof associations.$inferSelect;
export type ShareRow = typeof shares.$inferSelect;
export type PlaylistPinRow = typeof playlistPins.$inferSelect;
export type SyncRunRow = typeof syncRuns.$inferSelect;
