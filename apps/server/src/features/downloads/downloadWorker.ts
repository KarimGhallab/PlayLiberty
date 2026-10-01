import { mkdir, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { and, eq, inArray, sql } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';

import { TrackFileStatus } from '@playliberty/contracts';
import { YoutubeVideoUnavailableError } from '@playliberty/youtube';

import type { AppContext } from '../../shared/context.js';

import type { TrackRow } from '../../platform/database/schema.js';
import { tracks } from '../../platform/database/schema.js';
import type { JobHandle } from '../../platform/jobs/intervalJob.js';
import { startIntervalJob } from '../../platform/jobs/intervalJob.js';
import {
  mediaRelativePath,
  thumbnailRelativePath
} from '../../platform/media/mediaPaths.js';
import { markTrackSourceRemoved } from '../tracks/trackLifecycle.js';

/*
 * The slot that processes pending tracks. The queue is the `track` rows themselves,
 * so there is no jobs table and nothing to enqueue: a row with
 * `fileStatus: pending` is the work, and this is the one thing in the process that
 * acts on it.
 *
 * The worker is stoppable because the server has to shut down cleanly, and a
 * download interrupted mid-flight leaves a temporary file and a row still claiming
 * to be downloading, which is what the startup sweep undoes on the next boot.
 * The interval is the platform's, because unref'ing a timer and clearing it on
 * stop is not this feature's business. What a tick does is.
 */
export interface DownloadWorkerOptions {
  context: AppContext;
  logger: FastifyBaseLogger;
}

export type DownloadWorkerHandle = JobHandle;

/*
 * The worker reads three things from the context: the database it claims rows in,
 * the media paths it writes under, and the adapter it fetches through. Naming just
 * those lets a test drive one pass with a fake adapter and no server around it.
 */
type WorkerContext = Pick<AppContext, 'database' | 'mediaPaths' | 'youtube'>;

const WORKER_INTERVAL_MS = 30_000;

export function startDownloadWorker(
  options: DownloadWorkerOptions
): DownloadWorkerHandle {
  // A tick is asynchronous and a download outlasts the interval, so a second tick
  // while one is still running is skipped rather than started. The claim below is
  // what stops two passes from taking the same track; this stops two passes from
  // existing at all.
  let running = false;

  return startIntervalJob({
    intervalMs: WORKER_INTERVAL_MS,
    tick: (): void => {
      if (running) {
        return;
      }

      running = true;
      void processPendingTracks(
        options.context,
        options.logger,
        options.context.config.download.concurrency
      ).finally(() => {
        running = false;
      });
    }
  });
}

/*
 * One pass, exposed so a test can drive it without waiting on the interval. It
 * claims at most `concurrency` pending tracks in one conditional update and
 * downloads exactly the ones it moved, so a track another pass already claimed is
 * not fetched twice and a backlog is worked through across passes.
 */
export async function processPendingTracks(
  context: WorkerContext,
  logger: FastifyBaseLogger,
  concurrency: number
): Promise<void> {
  const claimed = claimPendingTracks(context, concurrency);

  await Promise.all(claimed.map(track => storeTrack(context, logger, track)));
}

/*
 * The claim is two statements and one batch. The first picks the oldest `pending`
 * rows up to the cap; the update then moves those rows to `downloading` only if
 * they are still `pending`, and returns exactly the ones it moved. A row another
 * pass already took is not in the result, so no download is started twice.
 */
function claimPendingTracks(
  context: WorkerContext,
  concurrency: number
): TrackRow[] {
  const batch = Math.max(1, Math.floor(concurrency));

  const candidates = context.database.db
    .select({ id: tracks.id })
    .from(tracks)
    .where(eq(tracks.fileStatus, TrackFileStatus.Pending))
    .orderBy(sql`${tracks}.rowid`)
    .limit(batch)
    .all();

  if (candidates.length === 0) {
    return [];
  }

  return context.database.db
    .update(tracks)
    .set({
      fileStatus: TrackFileStatus.Downloading,
      updatedAt: new Date().toISOString()
    })
    .where(
      and(
        eq(tracks.fileStatus, TrackFileStatus.Pending),
        inArray(
          tracks.id,
          candidates.map(candidate => candidate.id)
        )
      )
    )
    .returning()
    .all();
}

async function storeTrack(
  context: WorkerContext,
  logger: FastifyBaseLogger,
  track: TrackRow
): Promise<void> {
  // The adapter writes the finished file under the temporary directory, and the
  // move into the media store is one rename on the same filesystem. A crash
  // therefore leaves a temporary file and no stored file, never a stored file that
  // was half written, which is what the startup sweep cleans up.
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
      tempDir: context.mediaPaths.tempDir
    });

    await rename(result.filePath, storedPath);

    context.database.db
      .update(tracks)
      .set({
        fileStatus: TrackFileStatus.Stored,
        filePath: relativePath,
        failureReason: null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(tracks.id, track.id))
      .run();

    logger.info({ trackId: track.id, videoId: track.videoId }, 'track stored');
  } catch (error) {
    // A video the adapter reports as gone is terminal, not a failure: the track is
    // marked removed from the source and is never retried, reaching the same pair of
    // values the sync's retention pass produces.
    if (error instanceof YoutubeVideoUnavailableError) {
      markTrackSourceRemoved(context.database, track.id, track.fileStatus);
      logger.info(
        { trackId: track.id, videoId: track.videoId },
        'track source is gone'
      );
      return;
    }

    // Any other failure is transient: the reason is a bounded single line rather
    // than the adapter's raw output, because the row carries it and a stack trace is
    // not something a person acts on; the full error goes to the log. The next sync
    // returns the track to `pending` so it is tried again.
    context.database.db
      .update(tracks)
      .set({
        fileStatus: TrackFileStatus.Failed,
        failureReason: summarizeFailure(error),
        updatedAt: new Date().toISOString()
      })
      .where(eq(tracks.id, track.id))
      .run();

    logger.warn(
      { trackId: track.id, videoId: track.videoId, err: error },
      'track download failed'
    );
    return;
  }

  // The audio is stored; the artwork is best effort and never changes that.
  await fetchThumbnail(context, logger, track);
}

/*
 * The picture is fetched after the audio and on its own terms: a thumbnail that
 * fails leaves the path null and the track stored, because a missing picture is a
 * cosmetic loss and a failed audio fetch is not.
 */
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

    context.database.db
      .update(tracks)
      .set({ thumbnailPath: relativePath, updatedAt: new Date().toISOString() })
      .where(eq(tracks.id, track.id))
      .run();

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

/*
 * One line, bounded. The adapter's error message can be a multi-line tool excerpt,
 * and the stored reason is rendered in a track row and kept for a report, so it is
 * collapsed to a single line and capped rather than stored raw.
 */
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
