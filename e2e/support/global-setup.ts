import { mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

import { DATABASE_PATH, FAKE_SCRIPT, MEDIA_ROOT } from './paths';

/*
 * `better-sqlite3` opens a file and does not create its directory, so
 * `e2e/.data` has to exist before the server boots or the run fails on the first
 * connection. The media root the server creates itself, but clearing it here means
 * a run never reads a file a previous run stored.
 *
 * The scenario file is removed too, so a stack that boots before any test has
 * written a scenario is a stack whose fake has nothing to answer with, which is a
 * clear failure rather than a stale answer from last time.
 */
export default async function globalSetup(): Promise<void> {
  await mkdir(dirname(DATABASE_PATH), { recursive: true });
  await mkdir(MEDIA_ROOT, { recursive: true });
  await rm(FAKE_SCRIPT, { force: true });
}
