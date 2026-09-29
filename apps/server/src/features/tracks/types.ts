export enum TrackStreamOutcome {
  Ok = 'ok',
  NotFound = 'not_found',
  Forbidden = 'forbidden',
  NotStored = 'not_stored'
}

export type TrackStreamResult =
  | { outcome: TrackStreamOutcome.Ok; filePath: string }
  | { outcome: TrackStreamOutcome.NotFound }
  | { outcome: TrackStreamOutcome.Forbidden }
  | { outcome: TrackStreamOutcome.NotStored };

export enum TrackThumbnailOutcome {
  Ok = 'ok',
  NotFound = 'not_found',
  Forbidden = 'forbidden'
}

export type TrackThumbnailResult =
  | { outcome: TrackThumbnailOutcome.Ok; thumbnailPath: string }
  | { outcome: TrackThumbnailOutcome.NotFound }
  | { outcome: TrackThumbnailOutcome.Forbidden };
