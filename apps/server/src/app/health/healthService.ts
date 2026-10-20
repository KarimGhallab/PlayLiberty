import { access } from 'node:fs/promises';

import type { DatabaseHandle } from '../../platform/database/client.js';
import { pingDatabase } from '../../platform/database/ping.js';
import type { MediaPaths } from '../../platform/media/mediaPaths.js';

export interface ReadinessOptions {
  database: DatabaseHandle;
  mediaPaths: MediaPaths;
}

export type ReadinessResult =
  { ready: true } | { ready: false; error: unknown };

/* Readiness: the database answers and the media root is reachable, the platform
 * resources. Unlike /healthz, it touches disk, so a bad pod is taken out. */
export async function checkReadiness(
  options: ReadinessOptions
): Promise<ReadinessResult> {
  try {
    pingDatabase(options.database);
    await access(options.mediaPaths.root);
    return { ready: true };
  } catch (error) {
    return { ready: false, error };
  }
}
