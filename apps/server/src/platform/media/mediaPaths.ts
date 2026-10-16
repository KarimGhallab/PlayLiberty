import { mkdir } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';

/* Whether `dst` sits under `src`; both absolute, `src` ends in a separator so a
 * sibling sharing a prefix is not mistaken for a child. */
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

/* Resolved absolute: a relative `MEDIA_ROOT` would be taken against the working
 * directory, and `@fastify/static` rejects a relative root outright. */
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

/* Traversal guard, the second layer after the adapter: an id with `..` cannot
 * escape the store. POSIX `/` everywhere, since the path is stored data. */
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
