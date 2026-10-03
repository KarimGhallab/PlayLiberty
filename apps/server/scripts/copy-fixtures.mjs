import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * `tsc` copies `.ts` files and nothing else, so the E2E fake's fixtures, a real
 * M4A and a JPEG, would be missing from `dist` and the fake would fail on the
 * first download. This copies them beside the emitted fake.
 *
 * It runs on every build rather than on an E2E-only build, because a conditional
 * build step is one more thing that can be forgotten when the fake is used. The
 * files are two kilobytes.
 */

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, '..', 'src', 'app', 'testing', 'fixtures');
const destination = join(here, '..', 'dist', 'app', 'testing', 'fixtures');

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });
