import { YoutubeSourceKind } from '@playliberty/youtube';
import type {
  IYoutubeClient,
  YoutubeSource,
  YoutubeSourceEntry
} from '@playliberty/youtube';

/* The source seam: a `listSource` per run, answered from the queue in order.
 * A download throws, so a sync fetching audio fails, not passes. */

export const TEST_SOURCE_ID = 'PL1234567890abcdef';

export function testEntry(videoId: string): YoutubeSourceEntry {
  return {
    videoId,
    title: `Track ${videoId}`,
    durationSeconds: 180,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hq.jpg`
  };
}

export interface TestSourceOptions {
  title?: string;
  sourceId?: string;
}

export function testSource(
  entries: YoutubeSourceEntry[],
  options: TestSourceOptions = {}
): YoutubeSource {
  return {
    kind: YoutubeSourceKind.Playlist,
    sourceId: options.sourceId ?? TEST_SOURCE_ID,
    title: options.title ?? 'Evening Jazz',
    entries
  };
}

/* The source a video URL resolves to: one entry, as the adapter returns for a
 * single video. */
export function testVideo(videoId: string): YoutubeSource {
  return {
    kind: YoutubeSourceKind.Video,
    sourceId: videoId,
    title: `Track ${videoId}`,
    entries: [testEntry(videoId)]
  };
}

export function createFakeYoutube(...sources: YoutubeSource[]): IYoutubeClient {
  const queue = [...sources];

  return {
    listSource: async (): Promise<YoutubeSource> => {
      const next = queue.shift();

      if (next === undefined) {
        throw new Error('the fake adapter has no source left to read');
      }

      return next;
    },
    downloadTrack: async (): Promise<never> => {
      throw new Error('a sync must not download');
    },
    fetchThumbnail: async (): Promise<never> => {
      throw new Error('a sync must not fetch a thumbnail');
    }
  };
}
