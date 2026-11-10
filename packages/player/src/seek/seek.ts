/** The position and the request the element applies, bounded to the track. */
export interface SeekPatch {
  readonly positionSeconds: number;
  readonly seekTo: number;
}

/* The one position bound: the current track's declared duration, or null while
 * there is none. A guess could move the element to an unknown place. */
export function seekPatch(
  durationSeconds: number | null,
  seconds: number
): SeekPatch | null {
  if (
    durationSeconds === null ||
    durationSeconds <= 0 ||
    !Number.isFinite(seconds)
  ) {
    return null;
  }

  const position = Math.min(durationSeconds, Math.max(0, seconds));

  return { positionSeconds: position, seekTo: position };
}

export function seekFractionPatch(
  durationSeconds: number | null,
  fraction: number
): SeekPatch | null {
  if (!Number.isFinite(fraction)) {
    return null;
  }

  const duration = durationSeconds;

  if (duration === null || duration <= 0) {
    return null;
  }

  return seekPatch(duration, Math.min(1, Math.max(0, fraction)) * duration);
}
