import { z } from 'zod';

import {
  AssociationOrigin,
  PlaylistSyncStatus,
  Provider,
  ShareLevel,
  SyncRunStatus,
  TrackFileStatus,
  TrackSourceStatus,
  UserRole
} from './enums.js';

const identifier = z.string().min(1);
const isoDateTime = z.iso.datetime();

export const AccountSchema = z.object({
  id: identifier,
  displayName: z.string(),
  email: z.email().nullable(),
  avatarUrl: z.url().nullable(),
  role: z.enum(UserRole)
});

export const TrackSchema = z.object({
  id: identifier,
  provider: z.enum(Provider),
  videoId: z.string().min(1),
  title: z.string(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  thumbnailPath: z.string().nullable(),
  fileStatus: z.enum(TrackFileStatus),
  sourceStatus: z.enum(TrackSourceStatus),
  failureReason: z.string().nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime
});

export const PlaylistSchema = z.object({
  id: identifier,
  ownerAccountId: identifier,
  name: z.string(),
  coverUrl: z.url().nullable(),
  provider: z.enum(Provider),
  sourcePlaylistId: z.string().min(1),
  syncStatus: z.enum(PlaylistSyncStatus),
  lastSyncedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime
});

export const PlaylistTrackSchema = z.object({
  track: TrackSchema,
  origin: z.enum(AssociationOrigin),
  position: z.number().int().nonnegative()
});

export const ShareSchema = z.object({
  accountId: identifier,
  account: AccountSchema,
  level: z.enum(ShareLevel),
  createdAt: isoDateTime
});

export const SyncRunSchema = z.object({
  id: identifier,
  playlistId: identifier,
  status: z.enum(SyncRunStatus),
  addedCount: z.number().int().nonnegative(),
  retainedCount: z.number().int().nonnegative(),
  removedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  startedAt: isoDateTime,
  finishedAt: isoDateTime.nullable(),
  error: z.string().nullable()
});

export const ProblemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string().optional(),
  instance: z.string().optional()
});

export const CreatePlaylistInputSchema = z.object({
  url: z.url()
});

export const AddTrackInputSchema = z.object({
  url: z.url()
});

export const RenamePlaylistInputSchema = z.object({
  name: z.string().min(1).max(200)
});

export const SharePlaylistInputSchema = z.object({
  accountId: identifier,
  level: z.enum(ShareLevel)
});

export const PageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0)
});

export function createPageSchema<TItem extends z.ZodType>(
  item: TItem
): z.ZodType<{
  items: z.infer<TItem>[];
  total: number;
  limit: number;
  offset: number;
}> {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative()
  });
}
