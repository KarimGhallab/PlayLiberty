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
  TrackChanged = 'track.changed'
}
