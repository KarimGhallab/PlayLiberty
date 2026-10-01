import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const MEDIA_DIRECTORY = 'media';
export const THUMBNAILS_DIRECTORY = 'thumbnails';
export const TEMP_DIRECTORY = '.tmp';

export interface MediaPaths {
  root: string;
  mediaDir: string;
  thumbnailsDir: string;
  tempDir: string;
}

/*
 * The root is resolved to an absolute path because a relative `MEDIA_ROOT` is
 * taken against the working directory, and `@fastify/static` rejects a relative
 * root outright. Resolving here means every consumer, the static handler, the
 * health probe, yt-dlp's output path and the prune walk, gets one absolute root
 * and the subdirectories are derived from that value once.
 */
export function createMediaPaths(root: string): MediaPaths {
  const absoluteRoot = resolve(root);

  return {
    root: absoluteRoot,
    mediaDir: join(absoluteRoot, MEDIA_DIRECTORY),
    thumbnailsDir: join(absoluteRoot, THUMBNAILS_DIRECTORY),
    tempDir: join(absoluteRoot, TEMP_DIRECTORY)
  };
}

export function mediaRelativePath(videoId: string, extension: string): string {
  return join(MEDIA_DIRECTORY, videoId.slice(0, 2), `${videoId}${extension}`);
}

export function thumbnailRelativePath(videoId: string): string {
  return join(THUMBNAILS_DIRECTORY, videoId.slice(0, 2), `${videoId}.jpg`);
}

export async function ensureMediaDirectories(paths: MediaPaths): Promise<void> {
  await mkdir(paths.mediaDir, { recursive: true });
  await mkdir(paths.thumbnailsDir, { recursive: true });
  await mkdir(paths.tempDir, { recursive: true });
}
