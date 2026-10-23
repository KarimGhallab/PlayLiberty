import type { CoverCrop } from './types.js';

const CROP_FIELDS = ['cropX', 'cropY', 'cropWidth', 'cropHeight'] as const;

/* Two fractions that should sum to one can land just above it in binary
 * floating point, which is not a client error. */
const SUM_TOLERANCE = 1e-9;

export class InvalidCoverCropError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvalidCoverCropError';
  }
}

function fraction(query: Record<string, unknown>, field: string): number {
  const raw = query[field];

  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new InvalidCoverCropError(`${field} is not a number`);
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    throw new InvalidCoverCropError(`${field} is not a number`);
  }

  return value;
}

function assertInside(crop: CoverCrop): void {
  if (crop.x < 0 || crop.y < 0) {
    throw new InvalidCoverCropError('a crop starts inside the image');
  }

  if (crop.width <= 0 || crop.height <= 0) {
    throw new InvalidCoverCropError('a crop has an area');
  }

  const xEndsInside = crop.x + crop.width <= 1 + SUM_TOLERANCE;
  const yEndsInside = crop.y + crop.height <= 1 + SUM_TOLERANCE;

  if (!xEndsInside || !yEndsInside) {
    throw new InvalidCoverCropError('a crop stays inside the image');
  }
}

/* No field is no crop, which keeps today's dialog working unchanged; a partial
 * or malformed set is refused rather than guessed at. */
export function readCoverCrop(
  query: Record<string, unknown>
): CoverCrop | null {
  const present = CROP_FIELDS.filter(field => query[field] !== undefined);

  if (present.length === 0) {
    return null;
  }

  if (present.length !== CROP_FIELDS.length) {
    throw new InvalidCoverCropError('a crop carries all four fields');
  }

  const crop: CoverCrop = {
    x: fraction(query, 'cropX'),
    y: fraction(query, 'cropY'),
    width: fraction(query, 'cropWidth'),
    height: fraction(query, 'cropHeight')
  };

  assertInside(crop);

  return crop;
}
