import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export const MEDIA_DIRECTORY = 'media';
export const THUMBNAILS_DIRECTORY = 'thumbnails';
export const TEMP_DIRECTORY = '.tmp';

export interface MediaPaths {
  root: string;
  mediaDir: string;
  thumbnailsDir: string;
  tempDir: string;
}

export function createMediaPaths(root: string): MediaPaths {
  return {
    root,
    mediaDir: join(root, MEDIA_DIRECTORY),
    thumbnailsDir: join(root, THUMBNAILS_DIRECTORY),
    tempDir: join(root, TEMP_DIRECTORY)
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
