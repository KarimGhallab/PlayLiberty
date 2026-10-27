import type { FastifyReply } from 'fastify';

import { PlaylistNotFoundReason, ProblemCode } from '@playliberty/contracts';

import { sendProblem } from './problem.js';
import type { ProblemInput } from './problem.js';

/*
 * Every refusal the routes answer with a problem document. A feature names the
 * refusal its outcome carries; this table owns the status, the code and the
 * copy, so a route never authors one. A denial and a vanished row name the same
 * refusal on purpose.
 */
export enum Refusal {
  PlaylistNotFoundRead = 'playlist_not_found_read',
  PlaylistNotFoundManage = 'playlist_not_found_manage',
  PlaylistNotFoundWrite = 'playlist_not_found_write',
  PlaylistNotFoundTrack = 'playlist_not_found_track',
  CoverNotFound = 'cover_not_found',
  CoverInvalidImage = 'cover_invalid_image',
  TrackNotFound = 'track_not_found',
  ThumbnailNotFound = 'thumbnail_not_found',
  Forbidden = 'forbidden',
  TrackNotStored = 'track_not_stored',
  TrackNotRetryable = 'track_not_retryable',
  TrackNotFetchable = 'track_not_fetchable',
  AccountNotFound = 'account_not_found',
  SelfShare = 'self_share',
  SyncAlreadyRunning = 'sync_already_running',
  SyncRunAbsent = 'sync_run_absent'
}

/* A refusal is the outcome a feature returns when it will not act. */
export interface Refused {
  readonly outcome: 'refused';
  readonly refusal: Refusal;
}

/* The success shape for an outcome with no body of its own. */
export interface Succeeded {
  readonly outcome: 'ok';
}

/* The four playlist reasons, so a playlist-shaped outcome cannot name a track
 * refusal by mistake. */
export type PlaylistRefusal =
  | Refusal.PlaylistNotFoundRead
  | Refusal.PlaylistNotFoundManage
  | Refusal.PlaylistNotFoundWrite
  | Refusal.PlaylistNotFoundTrack;

const PROBLEMS: Record<Refusal, ProblemInput> = {
  [Refusal.PlaylistNotFoundRead]: playlistNotFound(PlaylistNotFoundReason.Read),
  [Refusal.PlaylistNotFoundManage]: playlistNotFound(
    PlaylistNotFoundReason.Manage
  ),
  [Refusal.PlaylistNotFoundWrite]: playlistNotFound(
    PlaylistNotFoundReason.Write
  ),
  [Refusal.PlaylistNotFoundTrack]: playlistNotFound(
    PlaylistNotFoundReason.Track
  ),
  [Refusal.CoverNotFound]: {
    status: 404,
    code: ProblemCode.CoverNotFound,
    title: 'Cover Not Found'
  },
  [Refusal.CoverInvalidImage]: {
    status: 422,
    code: ProblemCode.UnprocessableRequest,
    title: 'Unprocessable Request'
  },
  [Refusal.TrackNotFound]: {
    status: 404,
    code: ProblemCode.TrackNotFound,
    title: 'Track Not Found'
  },
  [Refusal.ThumbnailNotFound]: {
    status: 404,
    code: ProblemCode.ThumbnailNotFound,
    title: 'Thumbnail Not Found'
  },
  [Refusal.Forbidden]: {
    status: 403,
    code: ProblemCode.Forbidden,
    title: 'Forbidden'
  },
  [Refusal.TrackNotStored]: {
    status: 409,
    code: ProblemCode.TrackNotStored,
    title: 'Track Not Stored',
    detail: 'The track has no stored media to stream.'
  },
  [Refusal.TrackNotRetryable]: {
    status: 409,
    code: ProblemCode.TrackNotRetryable,
    title: 'Track Not Retryable',
    detail: 'Only a failed track can be retried.'
  },
  [Refusal.TrackNotFetchable]: {
    status: 409,
    code: ProblemCode.TrackNotFetchable,
    title: 'Track Not Fetchable',
    detail: 'Only a track that is waiting to be fetched can be fetched whole.'
  },
  [Refusal.AccountNotFound]: {
    status: 404,
    code: ProblemCode.AccountNotFound,
    title: 'Account Not Found',
    detail: 'The account this share names does not exist.'
  },
  [Refusal.SelfShare]: {
    status: 422,
    code: ProblemCode.SelfShare,
    title: 'Cannot Share With Yourself',
    detail: 'The playlist already belongs to this account.'
  },
  [Refusal.SyncAlreadyRunning]: {
    status: 409,
    code: ProblemCode.SyncAlreadyRunning,
    title: 'Sync Already Running',
    detail: 'A sync is already running for this playlist.'
  },
  [Refusal.SyncRunAbsent]: {
    status: 404,
    code: ProblemCode.SyncRunAbsent,
    title: 'No Sync Run',
    detail: 'This playlist has never been synced.'
  }
};

function playlistNotFound(reason: PlaylistNotFoundReason): ProblemInput {
  return {
    status: 404,
    code: ProblemCode.PlaylistNotFound,
    title: 'Playlist Not Found',
    params: { reason }
  };
}

export function sendRefusal(
  reply: FastifyReply,
  refusal: Refusal
): FastifyReply {
  return sendProblem(reply, PROBLEMS[refusal]);
}
