import { describe, expect, it } from '@jest/globals';

import { createFrameReader } from './liveEventStream';

function reader(): { frames: string[]; feed: (chunk: string) => void } {
  const frames: string[] = [];
  const feed = createFrameReader(data => {
    frames.push(data);
  });

  return { frames, feed };
}

describe('the event frame reader', () => {
  it('hands over the data of one frame', () => {
    const { frames, feed } = reader();

    feed('data: {"type":"ready"}\n\n');

    expect(frames).toEqual(['{"type":"ready"}']);
  });

  it('waits for the rest of a frame split across chunks', () => {
    const { frames, feed } = reader();

    feed('data: {"type":"rea');
    expect(frames).toEqual([]);

    feed('dy"}\n\n');
    expect(frames).toEqual(['{"type":"ready"}']);
  });

  it('hands over every frame of one chunk', () => {
    const { frames, feed } = reader();

    feed('data: one\n\ndata: two\n\n');

    expect(frames).toEqual(['one', 'two']);
  });

  it('ignores the keepalive comment', () => {
    const { frames, feed } = reader();

    feed(': keepalive\n\n');

    expect(frames).toEqual([]);
  });

  it('joins the data lines of one frame', () => {
    const { frames, feed } = reader();

    feed('data: first\ndata: second\n\n');

    expect(frames).toEqual(['first\nsecond']);
  });

  it('ignores a frame that carries no data', () => {
    const { frames, feed } = reader();

    feed('event: ping\n\n');

    expect(frames).toEqual([]);
  });

  it('keeps a partial frame for the next chunk', () => {
    const { frames, feed } = reader();

    feed('data: one\n\ndata: tw');

    expect(frames).toEqual(['one']);
  });
});
