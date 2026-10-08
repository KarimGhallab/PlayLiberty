import { fileURLToPath } from 'node:url';

/*
 * The paths the config and the tests both need, in one place so the server is
 * started on the file the tests write and there is one number for each port.
 */

export const SERVER_PORT = 8081;
export const WEB_PORT = 5273;
export const ROOT_DIR = fileURLToPath(new URL('../../', import.meta.url));

const here = (name: string): string =>
  fileURLToPath(new URL(`../${name}`, import.meta.url));

/* The scenario file the tests write and the server's fake adapter reads. */
export const FAKE_SCRIPT = here('.scenario.json');
export const MEDIA_ROOT = here('.media');
export const DATABASE_PATH = here('.data/playliberty.db');
