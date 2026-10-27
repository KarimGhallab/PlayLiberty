import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * `tsc` copies `.ts` and nothing else, so the fake's fixtures would be missing
 * from the output. Only the E2E build needs them, because the production build
 * omits the test harness.
 */

const here = dirname(fileURLToPath(import.meta.url));
const output = process.argv[2] ?? 'dist';
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
  output,
  'app',
  'testing',
  'e2eYoutube',
  'fixtures'
);

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
