/**
 * WCAG 2.1 contrast computation, used to prove that every theme combination is readable
 * (constitution XIII, SC-011).
 *
 * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */

/** Minimum contrast for body text (WCAG AA). */
export const AA_BODY_TEXT_RATIO = 4.5;

/** Minimum contrast for large text and UI components such as focus rings (WCAG AA). */
export const AA_NON_TEXT_RATIO = 3;

/** Number of hex digits of a `#RRGGBB` colour. */
const HEX_COLOR_LENGTH = 6;

/** Number of hex digits of one channel. */
const HEX_CHANNEL_LENGTH = 2;

/** Radix of hexadecimal digits. */
const HEX_RADIX = 16;

/** Maximum value of an 8-bit colour channel. */
const CHANNEL_MAX = 255;

/** sRGB linearisation threshold (WCAG 2.1 definition). */
const SRGB_LINEAR_THRESHOLD = 0.03928;

/** sRGB linear segment divisor. */
const SRGB_LINEAR_DIVISOR = 12.92;

/** sRGB gamma offset. */
const SRGB_GAMMA_OFFSET = 0.055;

/** sRGB gamma divisor. */
const SRGB_GAMMA_DIVISOR = 1.055;

/** sRGB gamma exponent. */
const SRGB_GAMMA_EXPONENT = 2.4;

/** Luminance weight of the red channel. */
const RED_WEIGHT = 0.2126;

/** Luminance weight of the green channel. */
const GREEN_WEIGHT = 0.7152;

/** Luminance weight of the blue channel. */
const BLUE_WEIGHT = 0.0722;

/** Luminance weights of the red, green and blue channels, in channel order. */
const LUMINANCE_WEIGHTS = [RED_WEIGHT, GREEN_WEIGHT, BLUE_WEIGHT] as const;

/** Index of the first digit of the blue channel in `RRGGBB`. */
const BLUE_CHANNEL_START = 4;

/** Flare term added to both luminances in the contrast formula. */
const CONTRAST_FLARE = 0.05;

/**
 * Parses a `#RRGGBB` colour into its 0–1 channels.
 *
 * @param hex - Colour such as `#8B7CF6`.
 * @returns The red, green and blue channels.
 * @throws {Error} When the value is not a 6-digit hex colour.
 */
function parseHex(hex: string): readonly [number, number, number] {
  const digits = hex.replace("#", "");
  if (digits.length !== HEX_COLOR_LENGTH || Number.isNaN(Number.parseInt(digits, HEX_RADIX))) {
    throw new Error(`Not a #RRGGBB colour: ${hex}`);
  }
  const channel = (index: number): number =>
    Number.parseInt(digits.slice(index, index + HEX_CHANNEL_LENGTH), HEX_RADIX) / CHANNEL_MAX;
  return [channel(0), channel(HEX_CHANNEL_LENGTH), channel(BLUE_CHANNEL_START)];
}

/**
 * Computes the relative luminance of a colour.
 *
 * @param hex - `#RRGGBB` colour.
 * @returns The relative luminance, 0 (black) to 1 (white).
 */
export function relativeLuminance(hex: string): number {
  const linear = parseHex(hex).map((value) =>
    value <= SRGB_LINEAR_THRESHOLD
      ? value / SRGB_LINEAR_DIVISOR
      : ((value + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_DIVISOR) ** SRGB_GAMMA_EXPONENT,
  );
  return linear.reduce((sum, value, index) => sum + value * (LUMINANCE_WEIGHTS[index] ?? 0), 0);
}

/**
 * Computes the WCAG contrast ratio between two colours (order does not matter).
 *
 * @param foreground - `#RRGGBB` colour.
 * @param background - `#RRGGBB` colour.
 * @returns The ratio, from 1 to 21.
 */
export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (first, second) => second - first,
  );
  return ((lighter ?? 0) + CONTRAST_FLARE) / ((darker ?? 0) + CONTRAST_FLARE);
}
