import sharp from 'sharp';
import type { Metadata, Sharp } from 'sharp';

export const MAX_COVER_BYTES = 5 * 1024 * 1024;
export const MAX_COVER_PIXELS = 64 * 1024 * 1024;
const COVER_LONG_EDGE = 1600;
const COVER_QUALITY = 86;

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export class InvalidCoverImageError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvalidCoverImageError';
  }
}

function createPipeline(input: Buffer): Sharp {
  return sharp(input, {
    limitInputPixels: MAX_COVER_PIXELS,
    failOn: 'error'
  });
}

/* The one image pipeline: the client sends original bytes, the server decides
 * the stored format, size and metadata policy. */
export async function normalizeCoverImage(input: Buffer): Promise<Buffer> {
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

  if (
    metadata.width === undefined ||
    metadata.height === undefined ||
    metadata.width * metadata.height > MAX_COVER_PIXELS
  ) {
    throw new InvalidCoverImageError('the image is larger than 64 megapixels');
  }

  if (metadata.pages !== undefined && metadata.pages > 1) {
    throw new InvalidCoverImageError('animated images are not accepted');
  }

  try {
    return await createPipeline(input)
      .rotate()
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
