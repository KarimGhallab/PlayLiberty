import { z } from 'zod';

import {
  AddTrackOutcome,
  AssociationOrigin,
  LiveEventType,
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

/*
 * The narrow view of an account a picker is drawn from: who they are, and nothing
 * about how to reach them or what they may do. The wider AccountSchema is the
 * caller's own view, served by GET /me, and reusing it in the directory would hand
 * every account in the household every other account's email address and role.
 */
export const AccountSummarySchema = z.object({
  id: identifier,
  displayName: z.string(),
  avatarUrl: z.url().nullable()
});

export const TrackSchema = z.object({
  id: identifier,
  provider: z.enum(Provider),
  videoId: z.string().min(1),
  title: z.string(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  skipNonMusic: z.boolean(),
  thumbnailPath: z.string().nullable(),
  fileStatus: z.enum(TrackFileStatus),
  sourceStatus: z.enum(TrackSourceStatus),
  failureReason: z.string().nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime
});

/*
 * The requesting account's relationship to a playlist.
 *
 * Three kinds of answer and not a fourth. A playlist the account cannot see is a
 * 404, which tickets 14 and 15 settled for the sync run and for both playlist
 * routes, so there is no "none" to carry here: the absence of a fourth value is
 * that disclosure decision restated on the wire, and adding one later would
 * reopen a question two tickets have already answered.
 *
 * `read` and `write` are ShareLevel's own members rather than a fresh pair of
 * strings, so a new level of sharing is automatically a new level of access and
 * nobody has to remember to add it in two places. What that cannot do is decide
 * what a new level means, and that decision is forced in the server instead:
 * playlistService's switch over ShareLevel is exhaustive, so adding a member
 * fails the build there rather than passing silently through here.
 */
export const PlaylistAccessSchema = z.union([
  z.literal('owner'),
  z.enum(ShareLevel)
]);

export const PlaylistSchema = z.object({
  id: identifier,
  ownerAccountId: identifier,
  name: z.string(),
  coverUrl: z.url().nullable(),
  provider: z.enum(Provider),
  sourcePlaylistId: z.string().min(1),
  syncStatus: z.enum(PlaylistSyncStatus),
  lastSyncedAt: isoDateTime.nullable(),
  trackCount: z.number().int().nonnegative(),
  skipNonMusic: z.boolean(),
  access: PlaylistAccessSchema,
  hasShares: z.boolean(),
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

export const ShareListSchema = z.array(ShareSchema);

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

/*
 * The live stream's payload. A discriminated union on `type`, so a new event
 * kind is a compile error at every handler that switches on it rather than a
 * silent drop, and the server and the client parse the same schema.
 */
export const LiveEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(LiveEventType.Ready) }),
  z.object({
    type: z.literal(LiveEventType.PlaylistChanged),
    playlistId: identifier
  }),
  z.object({
    type: z.literal(LiveEventType.TrackChanged),
    playlistIds: z.array(identifier).min(1)
  })
]);

export const CreatePlaylistInputSchema = z.object({
  url: z.url(),
  skipNonMusic: z.boolean().default(true)
});

export const AddTrackInputSchema = z.object({
  url: z.url(),
  playlistIds: z.array(identifier).min(1).max(100)
});

export const AddTrackOutcomeSchema = z.enum(AddTrackOutcome);

export const AddTrackResultSchema = z.object({
  results: z.array(
    z.object({
      playlistId: identifier,
      outcome: AddTrackOutcomeSchema
    })
  )
});

export const RenamePlaylistInputSchema = z.object({
  name: z.string().trim().min(1).max(200)
});

export const SkipNonMusicInputSchema = z.object({
  skipNonMusic: z.boolean()
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
