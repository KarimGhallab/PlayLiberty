import { z } from 'zod';

import {
  AddTrackOutcome,
  AssociationOrigin,
  EgressStatus,
  FailureKind,
  LiveEventType,
  PlaylistSort,
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
const nonNegative = z.number().int().nonnegative();

export const AccountSchema = z.object({
  id: identifier,
  displayName: z.string(),
  email: z.email().nullable(),
  avatarUrl: z.url().nullable(),
  role: z.enum(UserRole)
});

/* The picker's narrow view: who they are, without the email and role that
 * AccountSchema would hand every account in the household. */
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
  failureKind: z.enum(FailureKind).nullable(),
  failureReason: z.string().nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime
});

/* Three answers, not four: a playlist the account cannot see is a 404. `read`
 * and `write` are ShareLevel's own members, so a new level is a new access. */
export const PlaylistAccessSchema = z.union([
  z.literal('owner'),
  z.enum(ShareLevel)
]);

export const PlaylistSchema = z.object({
  id: identifier,
  ownerAccountId: identifier,
  name: z.string(),
  coverTrackId: identifier.nullable(),
  coverUpdatedAt: isoDateTime.nullable(),
  provider: z.enum(Provider),
  sourcePlaylistId: z.string().min(1),
  syncStatus: z.enum(PlaylistSyncStatus),
  lastSyncedAt: isoDateTime.nullable(),
  trackCount: z.number().int().nonnegative(),
  skipNonMusic: z.boolean(),
  sort: z.enum(PlaylistSort),
  access: PlaylistAccessSchema,
  hasShares: z.boolean(),
  pinned: z.boolean(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime
});

export const PlaylistTrackSchema = z.object({
  track: TrackSchema,
  origin: z.enum(AssociationOrigin),
  position: z.number().int().nonnegative()
});

export const PlaylistTrackListSchema = z.object({
  items: z.array(PlaylistTrackSchema)
});

export const TrackFileStatusCountsSchema = z.object({
  [TrackFileStatus.Stored]: nonNegative,
  [TrackFileStatus.Pending]: nonNegative,
  [TrackFileStatus.Downloading]: nonNegative,
  [TrackFileStatus.Failed]: nonNegative,
  [TrackFileStatus.Unavailable]: nonNegative
});

/* The playlist read plus file-status counts over the whole playlist, never the
 * page's rows; their sum is `trackCount`. */
export const PlaylistWithCountsSchema = PlaylistSchema.extend({
  counts: TrackFileStatusCountsSchema
});

export const PlaylistPageSchema = createPageSchema(PlaylistWithCountsSchema);

export const AccountSummaryPageSchema = createPageSchema(AccountSummarySchema);

export const PlaylistTracksPageSchema = z.object({
  items: z.array(PlaylistTrackSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
  counts: TrackFileStatusCountsSchema
});

export const ShareSchema = z.object({
  accountId: identifier,
  account: AccountSummarySchema,
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

/* One row per installed Proton config. `active` mirrors the agent's report,
 * and the timestamps are evidence: nothing is assumed healthy. */
export const EgressConfigSchema = z.object({
  name: z.string().min(1),
  endpoint: z.string().nullable(),
  status: z.enum(EgressStatus),
  active: z.boolean(),
  lastAttemptAt: isoDateTime.nullable(),
  lastCheckAt: isoDateTime.nullable(),
  lastExitIp: z.string().nullable(),
  lastError: z.string().nullable()
});

export const EgressReadSchema = z.object({
  /* The read still answers when the agent is down, so the page can say so
   * rather than showing an empty list. */
  agentReachable: z.boolean(),
  configs: z.array(EgressConfigSchema)
});

export const ProblemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  code: z.string(),
  detail: z.string().optional(),
  /* The values the client interpolates into a sentence whose copy varies, e.g.
   * the `playlist_not_found` reason. The client owns the words. */
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  instance: z.string().optional()
});

/* A discriminated union on `type`, so a new event kind is a compile error at
 * every handler rather than a silent drop. */
export const LiveEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal(LiveEventType.Ready) }),
  z.object({
    type: z.literal(LiveEventType.PlaylistChanged),
    playlistId: identifier
  }),
  z.object({
    type: z.literal(LiveEventType.PlaylistRemoved),
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

export const SortPlaylistInputSchema = z.object({
  sort: z.enum(PlaylistSort)
});

export const PinPlaylistInputSchema = z.object({
  pinned: z.boolean()
});

export const SharePlaylistInputSchema = z.object({
  accountId: identifier,
  level: z.enum(ShareLevel)
});

export const PageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0)
});

/* The app's provisioning entry: a PKCE challenge and the callback it will
 * accept a code on. `state` is opaque and echoed back. */
export const ProvisionQuerySchema = z.object({
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.literal('S256'),
  redirect_uri: z.url(),
  state: z.string().min(16).max(128)
});

/* The credential-less exchange: the code, its verifier, and the same callback
 * the code was minted for. */
export const ExchangeInputSchema = z.object({
  code: z.string().min(1),
  code_verifier: z.string().min(43).max(128),
  redirect_uri: z.url()
});

/* The token pair the app stores: the id and the secret Pangolin expects in its
 * two headers. */
export const MobileTokenSchema = z.object({
  id: identifier,
  secret: z.string().min(1)
});

export const PlaylistTracksQuerySchema = PageQuerySchema.extend({
  state: z.enum(TrackFileStatus).optional()
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
