import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { DatabaseHandle } from '../../../platform/database/client.js';
import type { MediaPaths } from '../../../platform/media/mediaPaths.js';
import { resetDownloadingTracks } from '../../tracks/trackLifecycle/trackLifecycle.js';

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

  const tracksReset = resetDownloadingTracks(database);

  return { tempEntriesRemoved: entries.length, tracksReset };
}
