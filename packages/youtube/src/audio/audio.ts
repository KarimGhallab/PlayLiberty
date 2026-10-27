import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { runProcess } from '../process/runProcess.js';
import type { FinalizeAudioOptions, FinalizeAudioRequest } from '../types.js';

export function buildFaststartArgs(
  inputPath: string,
  outputPath: string
): string[] {
  return [
    '-y',
    '-i',
    inputPath,
    '-c',
    'copy',
    '-movflags',
    '+faststart',
    '-f',
    'mp4',
    outputPath
  ];
}

/* ffprobe reports the container duration as a bare number; ffmpeg's
 * human-readable banner would break on a version or a locale. */
export function buildProbeArgs(filePath: string): string[] {
  return [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath
  ];
}

/* A non-numeric probe fails the download rather than storing a track with a
 * duration nobody can trust. */
async function probeDuration(
  binary: string,
  filePath: string,
  timeoutMs: number
): Promise<number> {
  const { stdout } = await runProcess(
    binary,
    buildProbeArgs(filePath),
    timeoutMs
  );
  const seconds = Number.parseFloat(stdout.trim());

  if (!Number.isFinite(seconds)) {
    throw new Error(`The duration probe returned no number for ${filePath}.`);
  }

  return Math.round(seconds);
}

/* The stored-file contract, independent of where the bytes came from: a
 * stream copy into a faststart container, then the duration read back from
 * what was written. */
export async function finalizeAudio(
  options: FinalizeAudioOptions,
  request: FinalizeAudioRequest
): Promise<number> {
  await mkdir(dirname(request.outputPath), { recursive: true });

  await runProcess(
    options.ffmpegBinary,
    buildFaststartArgs(request.inputPath, request.outputPath),
    options.timeoutMs
  );

  return probeDuration(
    options.ffprobeBinary,
    request.outputPath,
    options.timeoutMs
  );
}
