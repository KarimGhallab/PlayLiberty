import { mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

import { DATABASE_PATH, FAKE_SCRIPT, MEDIA_ROOT } from './paths';

/*
 * `better-sqlite3` does not create its directory, so `e2e/.data` must exist
 * before the server boots. Cleaning the media root and the scenario file keeps
 * a run from reading a previous run's file or stale answer.
 */
export default async function globalSetup(): Promise<void> {
  await mkdir(dirname(DATABASE_PATH), { recursive: true });
  await mkdir(MEDIA_ROOT, { recursive: true });
  await rm(FAKE_SCRIPT, { force: true });
}
