import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * `tsc` copies `.ts` and nothing else, so the fake's fixtures would be missing
 * from `dist`. It runs on every build, not just E2E, because a conditional step
 * is one more thing to forget; the files are two kilobytes.
 */

const here = dirname(fileURLToPath(import.meta.url));
const source = join(
  here,
  '..',
  'src',
  'app',
  'testing',
  'e2eYoutube',
  'fixtures'
);
const destination = join(
  here,
  '..',
  'dist',
  'app',
  'testing',
  'e2eYoutube',
  'fixtures'
);

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
