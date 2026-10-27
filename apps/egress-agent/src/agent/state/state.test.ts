import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readActiveState, writeActiveState } from './state.js';

let directory: string | undefined;

afterEach(async () => {
  if (directory !== undefined) {
    await rm(directory, { recursive: true, force: true });
    directory = undefined;
  }
});

async function statePath(): Promise<string> {
  directory = await mkdtemp(join(tmpdir(), 'playliberty-state-'));
  return join(directory, 'nested', 'active');
}

describe('active state', () => {
  it('has no name before the first write', async () => {
    expect(await readActiveState(await statePath())).toBeNull();
  });

  it('reads back the name it wrote, creating the directory', async () => {
    const path = await statePath();

    await writeActiveState(path, '02-CH-264');

    expect(await readActiveState(path)).toBe('02-CH-264');
  });
});
