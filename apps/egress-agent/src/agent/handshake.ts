import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const WG_TIMEOUT_MS = 5000;

/*
 * `latest-handshakes` prints one `<public key>\t<epoch seconds>` line per peer.
 * A null interface means this host has not been given one yet (development or
 * the dry run), which is "not measured", not "failed".
 */
export async function readHandshake(
  interfaceName: string | null,
  freshMs: number,
  now: number = Date.now()
): Promise<boolean | null> {
  if (interfaceName === null) {
    return null;
  }

  try {
    const { stdout } = await execFileAsync(
      'wg',
      ['show', interfaceName, 'latest-handshakes'],
      { timeout: WG_TIMEOUT_MS }
    );

    const newest = stdout
      .split('\n')
      .map(line => Number(line.split('\t')[1]))
      .filter(Number.isFinite)
      .reduce((latest, value) => Math.max(latest, value), 0);

    return newest > 0 && now - newest * 1000 <= freshMs;
  } catch {
    return false;
  }
}
