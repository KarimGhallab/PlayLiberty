import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';

import { TrackFileStatus } from '@playliberty/contracts';

import type { DatabaseHandle } from '../db/client.js';
import { tracks } from '../db/schema.js';
import type { MediaPaths } from './mediaPaths.js';

export interface StartupSweepResult {
  tempEntriesRemoved: number;
  tracksReset: number;
}

export async function runStartupSweep(
  paths: MediaPaths,
  database: DatabaseHandle
): Promise<StartupSweepResult> {
  const entries = await readdir(paths.tempDir, { withFileTypes: true }).catch(
    () => []
  );

  for (const entry of entries) {
    await rm(join(paths.tempDir, entry.name), { recursive: true, force: true });
  }

  const result = database.db
    .update(tracks)
    .set({
      fileStatus: TrackFileStatus.Pending,
      updatedAt: new Date().toISOString()
    })
    .where(eq(tracks.fileStatus, TrackFileStatus.Downloading))
    .run();

  return { tempEntriesRemoved: entries.length, tracksReset: result.changes };
}
