import { mkdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { FastifyBaseLogger } from 'fastify';

import { FailureDisposition, failureOf } from '@playliberty/youtube';

import type { AppContext } from '../../../shared/context.js';
import { ChangeKind, announce } from '../../../shared/events/liveEvents.js';
import { exhaust } from '../../../shared/exhaust.js';

import type { TrackRow } from '../../../platform/database/schema.js';
import { startIntervalJob } from '../../../platform/jobs/intervalJob.js';
import {
  mediaRelativePath,
  thumbnailRelativePath
} from '../../../platform/media/mediaPaths.js';
import {
  claimPendingTracks,
  failTrack,
  markTrackSourceRemoved,
  releaseTrack,
  storeThumbnail,
  storeTrack,
  storedFailureKind
} from '../../tracks/trackLifecycle/trackLifecycle.js';

/*
 * The queue is the `track` rows: no jobs table, nothing to enqueue, a
 * `pending` row is the work and this is the one thing that acts on it. An
 * interrupted download is left to the startup sweep.
 */
export interface DownloadWorkerOptions {
  context: WorkerContext;
  concurrency: number;
  logger: FastifyBaseLogger;
  intervalMs?: number;
}

export interface DownloadWorkerHandle {
  stop(): Promise<void>;
  kick(): void;
}

/* The four things a pass reads, so a test can drive one with fakes and no
 * server. */
type WorkerContext = Pick<
  AppContext,
  'database' | 'mediaPaths' | 'youtube' | 'events'
>;

const WORKER_INTERVAL_MS = 30_000;

export function startDownloadWorker(
  options: DownloadWorkerOptions
): DownloadWorkerHandle {
  // A download outlasts the interval, so an overlapping tick is skipped: the
  // claim stops two passes taking one track, this stops two passes existing.
  let inFlight: Promise<void> | null = null;

  const tick = (): void => {
    if (inFlight !== null) {
      return;
    }

    inFlight = processPendingTracks(
      options.context,
      options.logger,
      options.concurrency
    ).finally(() => {
      inFlight = null;
    });
  };

  const job = startIntervalJob({
    intervalMs: options.intervalMs ?? WORKER_INTERVAL_MS,
    tick
  });

  /* A pass now, not after a whole interval: a boot with `pending` rows must not
   * wait. */
  tick();

  return {
    kick: tick,
    stop: async (): Promise<void> => {
      job.stop();

      if (inFlight !== null) {
        await inFlight;
      }
    }
  };
}

/* One pass, exposed for tests. It claims in one guarded move and downloads just
 * what it moved, so a track another pass claimed is never fetched twice. */
export async function processPendingTracks(
  context: WorkerContext,
  logger: FastifyBaseLogger,
  concurrency: number
): Promise<void> {
  const claimed = claimPendingTracks(context.database, concurrency);

  for (const track of claimed) {
    announce(context, { kind: ChangeKind.TrackChanged, trackId: track.id });
  }

  await Promise.all(
    claimed.map(track => processClaimedTrack(context, logger, track))
  );
}

async function processClaimedTrack(
  context: WorkerContext,
  logger: FastifyBaseLogger,
  track: TrackRow
): Promise<void> {
  // The adapter writes to temp and the move is one same-filesystem rename, so a
  // crash leaves a temp file, never a half-written stored one.
  const relativePath = mediaRelativePath(track.videoId, '.m4a');
  const storedPath = join(context.mediaPaths.root, relativePath);
  const tempPath = join(
    context.mediaPaths.tempDir,
    `${track.videoId}.stored.m4a`
  );

  try {
    await mkdir(dirname(storedPath), { recursive: true });

    const result = await context.youtube.downloadTrack({
      videoId: track.videoId,
      outputPath: tempPath,
      tempDir: context.mediaPaths.tempDir,
      skipNonMusic: track.skipNonMusic
    });

    await rename(result.filePath, storedPath);

    storeTrack(context.database, track.id, {
      filePath: relativePath,
      durationSeconds: result.durationSeconds
    });

    logger.info({ trackId: track.id, videoId: track.videoId }, 'track stored');
  } catch (error) {
    const failure = failureOf(error);

    switch (failure.disposition) {
      // Terminal is the sync's retention answer too: marked removed, never
      // retried, and the file, if any, stays stored.
      case FailureDisposition.Terminal:
        markTrackSourceRemoved(context.database, track.id);
        announce(context, { kind: ChangeKind.TrackChanged, trackId: track.id });
        logger.info(
          { trackId: track.id, videoId: track.videoId },
          'track source is gone'
        );
        return;

      // Neither the track nor a workable exit is to blame, so the claim goes
      // back to pending and no row is blamed.
      case FailureDisposition.Interrupted:
      case FailureDisposition.ExitFault:
        releaseTrack(context.database, track.id);
        announce(context, { kind: ChangeKind.TrackChanged, trackId: track.id });
        logger.warn(
          { trackId: track.id, videoId: track.videoId, err: error },
          'track fetch interrupted'
        );
        return;

      // The reason is a bounded line, not the raw output, since the row carries
      // it; the next sync retries the track.
      case FailureDisposition.Retry:
        failTrack(
          context.database,
          track.id,
          storedFailureKind(failure.kind),
          summarizeFailure(error)
        );

        announce(context, { kind: ChangeKind.TrackChanged, trackId: track.id });

        logger.warn(
          { trackId: track.id, videoId: track.videoId, err: error },
          'track download failed'
        );
        return;

      default:
        return exhaust(failure.disposition);
    }
  }

  await fetchThumbnail(context, logger, track);
  announce(context, { kind: ChangeKind.TrackChanged, trackId: track.id });
}

/* A failed thumbnail leaves the path null and the track stored: cosmetic, not
 * fatal. */
async function fetchThumbnail(
  context: WorkerContext,
  logger: FastifyBaseLogger,
  track: TrackRow
): Promise<void> {
  if (track.thumbnailUrl === null) {
    return;
  }

  const relativePath = thumbnailRelativePath(track.videoId);
  const absolutePath = join(context.mediaPaths.root, relativePath);

  try {
    await context.youtube.fetchThumbnail(track.thumbnailUrl, absolutePath);

    storeThumbnail(context.database, track.id, relativePath);

    logger.info(
      { trackId: track.id, videoId: track.videoId },
      'thumbnail stored'
    );
  } catch (error) {
    logger.warn(
      { trackId: track.id, videoId: track.videoId, err: error },
      'thumbnail fetch failed'
    );
  }
}

const FAILURE_REASON_MAX = 200;

/* Collapsed and capped: the adapter message can be a multi-line tool excerpt,
 * the reason is rendered in a track row. */
function summarizeFailure(error: unknown): string {
  const collapsed = (error instanceof Error ? error.message : '')
    .replace(/\s+/g, ' ')
    .trim();

  if (collapsed.length === 0) {
    return 'The download failed.';
  }

  return collapsed.length > FAILURE_REASON_MAX
    ? `${collapsed.slice(0, FAILURE_REASON_MAX - 1)}…`
    : collapsed;
}
