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

/*
 * Readiness means the process can serve: the database answers and the media root
 * is reachable. Both are the two resources the server owns, so this is a check on
 * the platform rather than on any feature, and the error is handed back so the
 * route can log it, because logging is the framework's concern rather than this
 * function's.
 *
 * It is a readiness check and not a health check, which is why it touches the disk
 * at all: /healthz answers as long as the process is up, and /readyz answers only
 * when the process could actually serve a stream. A pod that is alive but cannot
 * reach its media root should be taken out of rotation, not reported as fine.
 */
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
