import type { SyncRun } from '@playliberty/contracts';

export enum SyncRunOutcome {
  Ok = 'ok',
  PlaylistNotFound = 'playlist_not_found',
  RunAbsent = 'run_absent'
}

export type SyncRunResult =
  | { outcome: SyncRunOutcome.Ok; run: SyncRun }
  | { outcome: SyncRunOutcome.PlaylistNotFound }
  | { outcome: SyncRunOutcome.RunAbsent };
