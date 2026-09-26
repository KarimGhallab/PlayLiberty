import { access } from 'node:fs/promises';

import type { DatabaseHandle } from '../db/client.js';
import type { MediaPaths } from '../media/mediaPaths.js';

export interface ReadinessOptions {
  database: DatabaseHandle;
  mediaPaths: MediaPaths;
}

export type ReadinessResult =
  { ready: true } | { ready: false; error: unknown };

// Readiness means the process can serve: the database answers and the media
// root is reachable. The error is handed back so the route can log it, because
// logging is the framework's concern, not the service's.
export async function checkReadiness(
  options: ReadinessOptions
): Promise<ReadinessResult> {
  try {
    options.database.sqlite.prepare('select 1').get();
    await access(options.mediaPaths.root);
    return { ready: true };
  } catch (error) {
    return { ready: false, error };
  }
}
