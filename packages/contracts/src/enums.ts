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

/* A config's last measured state: `unknown` until something probes or uses it,
 * so nothing is assumed healthy by default. */
export enum EgressStatus {
  Ok = 'ok',
  Failed = 'failed',
  Unknown = 'unknown'
}

export enum PlaylistSort {
  Playlist = 'playlist',
  NewestFirst = 'newest_first',
  OldestFirst = 'oldest_first'
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

/* `already_present` is a success, not a failure: the desired end state is
 * met. `refused` carries no reason, so cannot-see and cannot-write are one
 * answer. */
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

/* An event is an invalidation hint, never data: it names what changed and the
 * client refetches. `ready` follows a connection opening or reopening. */
export enum LiveEventType {
  Ready = 'ready',
  PlaylistChanged = 'playlist.changed',
  PlaylistRemoved = 'playlist.removed',
  TrackChanged = 'track.changed'
}

/* One contract, both ends: a rename on either side fails to compile, and a code
 * is stable and never localised. The client owns the sentence. */
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
  CoverNotFound = 'cover_not_found',
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

/* `playlist_not_found` carries one code but four sentences; this reason is what
 * varies the copy, and the client maps each member to its own sentence. */
export enum PlaylistNotFoundReason {
  Read = 'read',
  Write = 'write',
  Manage = 'manage',
  Track = 'track'
}
