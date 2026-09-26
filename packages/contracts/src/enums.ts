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

export enum ShareLevel {
  Read = 'read',
  Write = 'write'
}

export enum SyncRunStatus {
  Running = 'running',
  Completed = 'completed',
  Failed = 'failed'
}
