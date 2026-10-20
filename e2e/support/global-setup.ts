import { mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

import { e2eInstanceIndices, instancePaths } from './paths';

/*
 * `better-sqlite3` does not create its directory, so each instance's data
 * directory must exist before boot. The scenario directory is created once,
 * and cleaning each file keeps a run from reading a previous answer.
 */
export default async function globalSetup(): Promise<void> {
  await Promise.all(
    e2eInstanceIndices().map(async index => {
      const instance = instancePaths(index);

      await mkdir(dirname(instance.databasePath), { recursive: true });
      await mkdir(instance.mediaRoot, { recursive: true });
      await mkdir(dirname(instance.fakeScript), { recursive: true });
      await rm(instance.fakeScript, { force: true });
    })
  );
}
