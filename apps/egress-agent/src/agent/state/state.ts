import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/*
 * The state file is the agent's memory across a restart: one config name, one
 * line. The unit reads the same file before the agent starts, so the namespace
 * and the agent agree on which config is loaded.
 */
export async function readActiveState(path: string): Promise<string | null> {
  try {
    const name = (await readFile(path, 'utf8')).trim();

    return name.length === 0 ? null : name;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

/* Write beside the target and rename, so a crash never leaves half a name. */
export async function writeActiveState(
  path: string,
  name: string
): Promise<void> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true, mode: 0o700 });

  const temporary = `${path}.${String(process.pid)}.tmp`;

  try {
    await writeFile(temporary, `${name}\n`, { mode: 0o600 });
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}
