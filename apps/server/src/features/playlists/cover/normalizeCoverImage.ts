import sharp from 'sharp';
import type { Metadata, Sharp } from 'sharp';

import type { CoverCrop } from './types.js';

export const MAX_COVER_BYTES = 5 * 1024 * 1024;
export const MAX_COVER_PIXELS = 64 * 1024 * 1024;
const COVER_LONG_EDGE = 1600;
const COVER_QUALITY = 86;
const FIRST_QUARTER_TURN = 5;

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export class InvalidCoverImageError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvalidCoverImageError';
  }
}

interface Region {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/* Orientations 5 to 8 turn the stored axes a quarter, so the image a person
 * sees has its width and height swapped. */
function swapsAxes(orientation: number | undefined): boolean {
  return orientation !== undefined && orientation >= FIRST_QUARTER_TURN;
}

function centeredSquare(width: number, height: number): Region {
  const side = Math.min(width, height);

  return {
    left: Math.floor((width - side) / 2),
    top: Math.floor((height - side) / 2),
    width: side,
    height: side
  };
}

function cropRegion(crop: CoverCrop, width: number, height: number): Region {
  const left = Math.min(width - 1, Math.round(crop.x * width));
  const top = Math.min(height - 1, Math.round(crop.y * height));
  const right = Math.min(width, Math.round((crop.x + crop.width) * width));
  const bottom = Math.min(height, Math.round((crop.y + crop.height) * height));

  return {
    left,
    top,
    width: Math.min(width - left, Math.max(1, right - left)),
    height: Math.min(height - top, Math.max(1, bottom - top))
  };
}

function createPipeline(input: Buffer): Sharp {
  return sharp(input, {
    limitInputPixels: MAX_COVER_PIXELS,
    failOn: 'error'
  });
}

/* The one image pipeline: the client sends original bytes and fractions, the
 * server decides the stored format, orientation, region, size and metadata. */
export async function normalizeCoverImage(
  input: Buffer,
  crop: CoverCrop | null = null
): Promise<Buffer> {
  if (input.length > MAX_COVER_BYTES) {
    throw new InvalidCoverImageError('the image is larger than 5 MB');
  }

  let metadata: Metadata;

  try {
    metadata = await createPipeline(input).metadata();
  } catch {
    throw new InvalidCoverImageError('the body is not a decodable image');
  }

  if (metadata.format === undefined || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new InvalidCoverImageError('the image is not a JPEG, PNG or WebP');
  }

  const width = metadata.width;
  const height = metadata.height;

  if (
    width === undefined ||
    height === undefined ||
    width * height > MAX_COVER_PIXELS
  ) {
    throw new InvalidCoverImageError('the image is larger than 64 megapixels');
  }

  if (metadata.pages !== undefined && metadata.pages > 1) {
    throw new InvalidCoverImageError('animated images are not accepted');
  }

  const swaps = swapsAxes(metadata.orientation);
  const orientedWidth = swaps ? height : width;
  const orientedHeight = swaps ? width : height;
  const region =
    crop === null
      ? centeredSquare(orientedWidth, orientedHeight)
      : cropRegion(crop, orientedWidth, orientedHeight);

  try {
    return await createPipeline(input)
      .rotate()
      .extract(region)
      .resize({
        width: COVER_LONG_EDGE,
        height: COVER_LONG_EDGE,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: COVER_QUALITY })
      .toBuffer();
  } catch {
    throw new InvalidCoverImageError('the image could not be normalised');
  }
}
