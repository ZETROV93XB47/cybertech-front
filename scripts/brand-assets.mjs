/**
 * Generates the brand images of the site from the logo supplied by the owner,
 * `styles/cybertech-logo-1-fond-sombre.png` (feature 005, Phase 7, T049). Run once after a change
 * of the source and commit the outputs:
 *
 *   node scripts/brand-assets.mjs
 *
 * The source has an opaque dark gradient background, which would show as a rectangle on the
 * header. It is removed with a colour-to-alpha pass against a background estimate (the gradient
 * filled under the logo by normalised convolution), so that the glow of the « C » stays as partial
 * transparency. Outputs:
 * - `public/brand/cybertech-lockup.png`: mark, wordmark and « Premium tech store » (footer);
 * - `public/brand/cybertech-wordmark.png`: mark and wordmark, without the tagline (header);
 * - `app/icon.png`: the « C » mark alone, transparent, square (favicon);
 * - `app/apple-icon.png`: the « C » mark on its original background, square (home screen icons
 *   cannot be transparent).
 *
 * `sharp` comes with Next.js; no dependency is added.
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

/** Root of the project. */
const ROOT = join(import.meta.dirname, "..");

/** Source logo, kept out of `public/` (never served as is). */
const SOURCE = join(ROOT, "styles", "cybertech-logo-1-fond-sombre.png");

/** Folder of the served brand images. */
const BRAND_DIR = join(ROOT, "public", "brand");

/** White strip on the right edge of the source, cut before anything else. */
const SOURCE_RIGHT_STRIP_PX = 3;

/** Colour channels of a pixel (red, green, blue). */
const RGB = 3;

/** Index of the alpha channel in an RGBA pixel. */
const ALPHA_INDEX = 3;

/** Divisor giving the middle of a length. */
const HALF = 2;

/** A padding applies on both sides of a length. */
const BOTH_SIDES = 2;

/** Channels of a raw RGBA buffer. */
const RGBA = 4;

/** Highest channel value. */
const CHANNEL_MAX = 255;

/**
 * A pixel whose brightest channel exceeds this belongs to the logo: the background gradient stays
 * under about 60 on its brightest channel, the logo colours are far above.
 */
const LOGO_MIN_PEAK = 90;

/** Pixels around the logo also ignored by the background estimate (glow). */
const LOGO_MARGIN_PX = 40;

/** Downscale factor of the background estimate (the gradient is smooth). */
const BACKGROUND_SCALE = 8;

/** Blur of the background estimate, in downscaled pixels. */
const BACKGROUND_SIGMA = 18;

/** Alpha below this is background noise and becomes fully transparent. */
const ALPHA_FLOOR = 0.05;

/** A column or row holds the logo when one of its pixels is more opaque than this. */
const OPAQUE_ALPHA = 64;

/** Smallest empty band separating the mark from the text, or the wordmark from the tagline. */
const MIN_GAP_PX = 12;

/**
 * Height of the header wordmark file: three times its displayed height, sharp on dense screens.
 */
const WORDMARK_HEIGHT_PX = 144;

/** Height of the footer lockup file: three times its displayed height. */
const LOCKUP_HEIGHT_PX = 216;

/** Size of the favicon, in pixels. */
const ICON_SIZE = 512;

/** Size of the home screen icon, in pixels. */
const APPLE_ICON_SIZE = 180;

/** Room around the mark in the square icons, as a share of the side. */
const ICON_PADDING_RATIO = 0.08;

/**
 * Reads the source without its right strip, as raw RGBA.
 *
 * @returns The pixels and their size.
 */
async function readSource() {
  const { width, height } = await sharp(SOURCE).metadata();
  return sharp(SOURCE)
    .extract({ left: 0, top: 0, width: width - SOURCE_RIGHT_STRIP_PX, height })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

/**
 * Marks the background pixels (brightest channel under {@link LOGO_MIN_PEAK}), shrunk by a margin
 * so that the glow around the logo is not taken for background.
 *
 * @param {Buffer} data - RGBA pixels.
 * @param {number} width - Width.
 * @param {number} height - Height.
 * @returns {Promise<Buffer>} One byte per pixel: 255 for background, 0 for logo.
 */
async function backgroundMask(data, width, height) {
  const mask = Buffer.alloc(width * height);
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * RGBA;
    const peak = Math.max(...data.subarray(offset, offset + RGB));
    mask[index] = peak > LOGO_MIN_PEAK ? 0 : CHANNEL_MAX;
  }
  // Eroding the background (a minimum filter) grows the logo area by the margin.
  return sharp(mask, { raw: { width, height, channels: 1 } })
    .erode(LOGO_MARGIN_PX)
    .raw()
    .toBuffer();
}

/**
 * Estimates the background under the logo: blur of the background pixels divided by the blur of
 * the mask (normalised convolution), at a reduced scale, then scaled back.
 *
 * @param {Buffer} data - RGBA pixels.
 * @param {Buffer} mask - Background mask.
 * @param {number} width - Width.
 * @param {number} height - Height.
 * @returns {Promise<Float32Array>} RGB background per pixel.
 */
async function estimateBackground(data, mask, width, height) {
  const small = {
    width: Math.ceil(width / BACKGROUND_SCALE),
    height: Math.ceil(height / BACKGROUND_SCALE),
  };
  const masked = Buffer.alloc(width * height * RGBA);
  for (let index = 0; index < width * height; index += 1) {
    const keep = mask[index] === CHANNEL_MAX;
    for (let channel = 0; channel < RGB; channel += 1) {
      masked[index * RGBA + channel] = keep ? data[index * RGBA + channel] : 0;
    }
    masked[index * RGBA + ALPHA_INDEX] = mask[index];
  }
  const blurred = await sharp(masked, { raw: { width, height, channels: RGBA } })
    .resize(small.width, small.height, { kernel: "linear" })
    .blur(BACKGROUND_SIGMA)
    .resize(width, height, { kernel: "linear" })
    .raw()
    .toBuffer();
  const background = new Float32Array(width * height * RGB);
  for (let index = 0; index < width * height; index += 1) {
    const weight = Math.max(blurred[index * RGBA + ALPHA_INDEX], 1) / CHANNEL_MAX;
    for (let channel = 0; channel < RGB; channel += 1) {
      background[index * RGB + channel] = Math.min(
        blurred[index * RGBA + channel] / weight,
        CHANNEL_MAX,
      );
    }
  }
  return background;
}

/**
 * Colour-to-alpha (as in GIMP): the smallest opacity that explains each pixel as the logo colour
 * over the estimated background, then the logo colour itself. Only what is brighter than the
 * background counts: the logo is light on dark, and the darker shades of the source (soft shadows
 * under the letters, dark ring inside the « C ») would turn into grey halos on any other background.
 *
 * @param {Buffer} data - RGBA pixels, rewritten in place.
 * @param {Float32Array} background - RGB background per pixel.
 */
function colourToAlpha(data, background) {
  for (let index = 0; index < data.length / RGBA; index += 1) {
    let alpha = 0;
    for (let channel = 0; channel < RGB; channel += 1) {
      const colour = data[index * RGBA + channel];
      const base = background[index * RGB + channel];
      alpha = Math.max(alpha, colour > base ? (colour - base) / (CHANNEL_MAX - base) : 0);
    }
    alpha = alpha < ALPHA_FLOOR ? 0 : (alpha - ALPHA_FLOOR) / (1 - ALPHA_FLOOR);
    for (let channel = 0; channel < RGB && alpha > 0; channel += 1) {
      const colour = data[index * RGBA + channel];
      const base = background[index * RGB + channel];
      data[index * RGBA + channel] = Math.round(
        Math.min(Math.max((colour - base) / alpha + base, 0), CHANNEL_MAX),
      );
    }
    data[index * RGBA + ALPHA_INDEX] = Math.round(alpha * CHANNEL_MAX);
  }
}

/**
 * Finds the first empty band of at least {@link MIN_GAP_PX} along one axis, after some logo.
 *
 * @param {(position: number) => boolean} hasLogo - Whether a column or row holds the logo.
 * @param {number} start - First position to scan.
 * @param {number} end - Position after the last one.
 * @returns {number} The first position of the gap.
 * @throws {Error} When the source has no such gap.
 */
function firstGap(hasLogo, start, end) {
  let seenLogo = false;
  let gapStart = -1;
  for (let position = start; position < end; position += 1) {
    if (hasLogo(position)) {
      seenLogo = true;
      gapStart = -1;
    } else if (seenLogo && gapStart < 0) {
      gapStart = position;
    } else if (seenLogo && position - gapStart >= MIN_GAP_PX) {
      return gapStart;
    }
  }
  throw new Error("No gap found: the layout of the source logo changed");
}

/**
 * Splits the logo: the column where the text starts, and the row where the tagline starts.
 *
 * @param {Buffer} data - RGBA pixels with alpha.
 * @param {number} width - Width.
 * @param {number} height - Height.
 * @returns {{ markEnd: number, taglineTop: number }} The split positions.
 */
function findLayout(data, width, height) {
  const opaque = (x, y) => data[(y * width + x) * RGBA + ALPHA_INDEX] > OPAQUE_ALPHA;
  const markEnd = firstGap(
    (x) => Array.from({ length: height }, (_, y) => y).some((y) => opaque(x, y)),
    0,
    width,
  );
  const textStart = Array.from({ length: width - markEnd }, (_, i) => markEnd + i).find((x) =>
    Array.from({ length: height }, (_, y) => y).some((y) => opaque(x, y)),
  );
  const taglineTop = firstGap(
    (y) =>
      Array.from({ length: width - textStart }, (_, i) => textStart + i).some((x) => opaque(x, y)),
    0,
    height,
  );
  return { markEnd, taglineTop: taglineTop + Math.floor(MIN_GAP_PX / HALF) };
}

/**
 * Writes a raw RGBA image, trimmed to its opaque content, then scaled down to a height.
 *
 * @param {Buffer} data - RGBA pixels.
 * @param {number} width - Width.
 * @param {number} height - Height.
 * @param {number} outputHeight - Height of the written image, in pixels.
 * @param {string} path - Output file.
 */
async function writeTrimmed(data, width, height, outputHeight, path) {
  const trimmed = await sharp(data, { raw: { width, height, channels: RGBA } })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .png()
    .toBuffer();
  await sharp(trimmed).resize({ height: outputHeight }).png({ compressionLevel: 9 }).toFile(path);
}

/**
 * Writes a square icon of the mark, centred with some room.
 *
 * @param {sharp.Sharp} mark - Mark image, already cropped.
 * @param {number} size - Side, in pixels.
 * @param {sharp.RGBA} background - Fill around the mark.
 * @param {string} path - Output file.
 */
async function writeIcon(mark, size, background, path) {
  const inner = Math.round(size * (1 - BOTH_SIDES * ICON_PADDING_RATIO));
  const resized = await mark.resize(inner, inner, { fit: "contain", background }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: RGBA, background } })
    .composite([{ input: resized, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path);
}

const { data, info } = await readSource();
const { width, height } = info;
const original = Buffer.from(data);
const mask = await backgroundMask(data, width, height);
colourToAlpha(data, await estimateBackground(data, mask, width, height));
const { markEnd, taglineTop } = findLayout(data, width, height);

await mkdir(BRAND_DIR, { recursive: true });
await writeTrimmed(data, width, height, LOCKUP_HEIGHT_PX, join(BRAND_DIR, "cybertech-lockup.png"));

const wordmark = Buffer.from(data);
for (let y = taglineTop; y < height; y += 1) {
  for (let x = markEnd; x < width; x += 1) {
    wordmark[(y * width + x) * RGBA + ALPHA_INDEX] = 0;
  }
}
await writeTrimmed(
  wordmark,
  width,
  height,
  WORDMARK_HEIGHT_PX,
  join(BRAND_DIR, "cybertech-wordmark.png"),
);

const markOnly = Buffer.from(data);
for (let y = 0; y < height; y += 1) {
  markOnly.fill(0, (y * width + markEnd) * RGBA, (y + 1) * width * RGBA);
}
const markPng = await sharp(markOnly, { raw: { width, height, channels: RGBA } })
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
  .png()
  .toBuffer({ resolveWithObject: true });
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
await writeIcon(sharp(markPng.data), ICON_SIZE, transparent, join(ROOT, "app", "icon.png"));

// The home screen icon keeps the original background: square crop centred on the mark, with the
// same room as the favicon (sharp reports the trimmed box as negative offsets).
const markBox = markPng.info;
const centreX = -markBox.trimOffsetLeft + markBox.width / HALF;
const centreY = -markBox.trimOffsetTop + markBox.height / HALF;
const side = Math.min(
  Math.round(Math.max(markBox.width, markBox.height) / (1 - BOTH_SIDES * ICON_PADDING_RATIO)),
  height,
);
const clamp = (value, max) => Math.min(Math.max(Math.round(value), 0), max);
await sharp(original, { raw: { width, height, channels: RGBA } })
  .extract({
    left: clamp(centreX - side / HALF, width - side),
    top: clamp(centreY - side / HALF, height - side),
    width: side,
    height: side,
  })
  .resize(APPLE_ICON_SIZE, APPLE_ICON_SIZE)
  .png({ compressionLevel: 9 })
  .toFile(join(ROOT, "app", "apple-icon.png"));
