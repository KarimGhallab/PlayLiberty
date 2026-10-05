import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { durations } from '../values.js';
import { playPauseMorph } from './morph.js';

/** The shape the design generator writes, beside the table in the record. */
interface GeneratedMorph {
  name: string;
  frames: number;
  duration: string;
  pin: string;
  endpoints: { play: string; pause: string };
  stripTravel: number;
  table: Array<{ index: number; exact: boolean; paths: string[] }>;
}

const generatedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../docs/design/generated/play-pause-morph.json'
);

describe('the play to pause morph', () => {
  it('is the table the design generator emitted', async () => {
    const generated = JSON.parse(
      await readFile(generatedPath, 'utf8')
    ) as GeneratedMorph;

    expect(playPauseMorph.name).toBe(generated.name);
    expect(playPauseMorph.frames).toBe(generated.frames);
    expect(generated.duration).toBe('var(--motion-base)');
    expect(playPauseMorph.durationMs).toBe(durations['motion-base'].value);
    expect(playPauseMorph.pin).toBe(generated.pin);
    expect(playPauseMorph.endpoints).toEqual(generated.endpoints);
    expect(playPauseMorph.stripTravel).toBe(generated.stripTravel);
    expect(playPauseMorph.table).toEqual(generated.table);
  });
});
