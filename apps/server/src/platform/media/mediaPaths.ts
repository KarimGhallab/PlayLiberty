import { mkdir } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';

/*
 * Whether `dst` sits under `src`. Both are absolute paths and `src` ends in a
 * separator, so a sibling whose name merely starts with it is not mistaken for a
 * child.
 */
function isSubPath(src: string, dst: string): boolean {
  return dst.startsWith(src) && dst.length > src.length;
}

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
  return shardedRelativePath(
    MEDIA_DIRECTORY,
    videoId,
    `${videoId}${extension}`
  );
}

export function thumbnailRelativePath(videoId: string): string {
  return shardedRelativePath(THUMBNAILS_DIRECTORY, videoId, `${videoId}.jpg`);
}

/*
 * A sharded relative path for a video id, refused when the id would resolve
 * outside the directory it belongs to. The adapter rejects a non-video id before
 * it is stored, so this is the second layer: a corrupted row or a future caller
 * that passes `..` or a separator cannot make the path escape the media store.
 *
 * The path is built and guarded with the POSIX rules and carries `/` on every
 * host, because it is stored as data rather than used as a host path: a Windows
 * `\` would make the value non-portable and, worse, `@fastify/static` rejects a
 * relative path containing one outright, so the stream and thumbnail routes
 * would answer 403 on Windows. Every consumer joins it onto an absolute root,
 * and `join` accepts `/` on every platform.
 */
function shardedRelativePath(
  directory: string,
  videoId: string,
  leaf: string
): string {
  const relative = posix.join(directory, videoId.slice(0, 2), leaf);
  const root = `${posix.resolve('/', directory)}/`;
  const resolved = posix.resolve('/', relative);

  if (!isSubPath(root, resolved)) {
    throw new Error(
      `The video id "${videoId}" resolves outside the media store.`
    );
  }

  return relative;
}

export async function ensureMediaDirectories(paths: MediaPaths): Promise<void> {
  await mkdir(paths.mediaDir, { recursive: true });
  await mkdir(paths.thumbnailsDir, { recursive: true });
  await mkdir(paths.tempDir, { recursive: true });
}
