import { YoutubeSourceKind } from '@playliberty/youtube';
import type {
  IYoutubeClient,
  YoutubeSource,
  YoutubeSourceEntry
} from '@playliberty/youtube';

/*
 * The source seam, substituted at the interface the app already publishes.
 *
 * A test that exercises the sync passes a fake here and never spawns yt-dlp: one
 * `listSource` call per run, answered from the queue in order, and a download that
 * throws, so a sync that tried to fetch audio would fail the run rather than pass
 * quietly.
 */

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

/*
 * The source a video URL resolves to. One entry, which is what the adapter returns
 * for a single video, and the track the batch add creates from it.
 */
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
