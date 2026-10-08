export enum Provider {
  Youtube = 'youtube'
}

export enum UserRole {
  Admin = 'admin',
  User = 'user'
}

export enum PlaylistSyncStatus {
  Idle = 'idle',
  Syncing = 'syncing',
  Error = 'error'
}

export enum TrackFileStatus {
  Pending = 'pending',
  Downloading = 'downloading',
  Stored = 'stored',
  Failed = 'failed',
  Unavailable = 'unavailable'
}

export enum TrackSourceStatus {
  Available = 'available',
  Removed = 'removed'
}

export enum AssociationOrigin {
  Remote = 'remote',
  Manual = 'manual'
}

/*
 * What one playlist did with a pasted video. `already_present` is the outcome the
 * association service already returns, and it is a success rather than a failure:
 * the desired end state is the one the user asked for. `refused` carries no reason,
 * so a playlist the account cannot see and one it cannot write are one answer.
 */
export enum AddTrackOutcome {
  Added = 'added',
  AlreadyPresent = 'already_present',
  Refused = 'refused'
}

export enum ShareLevel {
  Read = 'read',
  Write = 'write'
}

export enum SyncRunStatus {
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed'
}

/*
 * The events the server pushes to a client over the live stream, one connection
 * per tab. An event is an invalidation hint and never data: it names what
 * changed, and the client refetches the reads it already owns. `ready` is sent
 * when a connection opens, so a client that reconnects re-reads what it holds.
 */
export enum LiveEventType {
  Ready = 'ready',
  PlaylistChanged = 'playlist.changed',
  PlaylistRemoved = 'playlist.removed',
  TrackChanged = 'track.changed'
}

/*
 * The problem codes the server may answer with, as one contract shared by both
 * ends. The server cannot build a problem outside this set, and the client's
 * mapping is checked against the same members, so a code cannot be renamed on one
 * side and left behind on the other. A code is stable and never localised: the
 * client owns the sentence and the server owns the reason that varies it.
 */
export enum ProblemCode {
  NotImplemented = 'not_implemented',
  InvalidRequest = 'invalid_request',
  ValidationFailed = 'validation_failed',
  UnprocessableRequest = 'unprocessable_request',
  PlaylistNotFound = 'playlist_not_found',
  SyncAlreadyRunning = 'sync_already_running',
  SyncRunAbsent = 'sync_run_absent',
  TrackNotFound = 'track_not_found',
  TrackNotStored = 'track_not_stored',
  TrackNotRetryable = 'track_not_retryable',
  TrackNotFetchable = 'track_not_fetchable',
  ThumbnailNotFound = 'thumbnail_not_found',
  Forbidden = 'forbidden',
  SelfShare = 'self_share',
  AccountNotFound = 'account_not_found',
  NotFound = 'not_found',
  RequestError = 'request_error',
  InternalError = 'internal_error',
  Unauthenticated = 'unauthenticated',
  CsrfHeaderMissing = 'csrf_header_missing',
  CsrfCrossSite = 'csrf_cross_site',
  CsrfOriginMismatch = 'csrf_origin_mismatch'
}

/*
 * The scope a `playlist_not_found` is refused in. The code is one, the sentence
 * is four, and the reason is the only thing that varies: a read, a write, the
 * share management, or the track route's narrower "cannot write it, or the track
 * is not in it". The client maps each member to its own sentence, so the reason
 * is a contract and not free text.
 */
export enum PlaylistNotFoundReason {
  Read = 'read',
  Write = 'write',
  Manage = 'manage',
  Track = 'track'
}
