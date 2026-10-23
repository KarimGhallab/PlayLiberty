import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { EgressAgentConfig } from '@playliberty/youtube';

const CONFIG_SUFFIX = '.conf';
const ENDPOINT_PATTERN = /^\s*Endpoint\s*=\s*(\S+)\s*$/m;

export function endpointOf(content: string): string | null {
  return ENDPOINT_PATTERN.exec(content)?.[1] ?? null;
}

/* The file stem is the name, and the `NN-` prefix is the round-robin order:
 * Proton's comment lines are not a contract. A config with no endpoint is
 * reported with a null rather than dropped, so a broken file stays visible. */
export async function readPool(
  directory: string
): Promise<EgressAgentConfig[]> {
  const names = (await readdir(directory))
    .filter(name => name.endsWith(CONFIG_SUFFIX))
    .sort();

  return Promise.all(
    names.map(async name => ({
      name: name.slice(0, -CONFIG_SUFFIX.length),
      endpoint: endpointOf(await readFile(join(directory, name), 'utf8'))
    }))
  );
}
