import { describe, expect, it } from 'vitest';

import { buildFaststartArgs, buildProbeArgs } from './audio.js';

describe('buildFaststartArgs', () => {
  it('stream-copies with the faststart flag', () => {
    const args = buildFaststartArgs(
      '/media/.tmp/track.m4a',
      '/media/ab/track.m4a'
    );

    expect(args).toContain('-c');
    expect(args).toContain('copy');
    expect(args).toContain('-movflags');
    expect(args).toContain('+faststart');
    expect(args.at(-1)).toBe('/media/ab/track.m4a');
  });
});

describe('buildProbeArgs', () => {
  it('asks for the container duration as a bare number', () => {
    const args = buildProbeArgs('/media/ab/track.m4a');

    expect(args).toContain('-show_entries');
    expect(args[args.indexOf('-show_entries') + 1]).toBe('format=duration');
    expect(args).toContain('-of');
    expect(args[args.indexOf('-of') + 1]).toBe(
      'default=noprint_wrappers=1:nokey=1'
    );
    expect(args.at(-1)).toBe('/media/ab/track.m4a');
  });
});
