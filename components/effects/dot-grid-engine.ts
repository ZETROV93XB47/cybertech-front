/**
 * Engine of the reactive dot grid (spec annex « Effet signature »): pure geometry and drawing,
 * separated from the React component so the physics can be unit-tested.
 *
 * Around the cursor, within `radiusPx`, dots appear, grow and are pushed outwards; they come
 * back with inertia when the cursor leaves. Every parameter comes from
 * `THEME.effects[level].dotGrid`.
 */
import type { DotGridSettings } from "@/lib/theme/types";

/** Movement below which a dot is considered at rest (in pixels or opacity units). */
const REST_EPSILON = 0.01;

/** Divisor giving half a length (grid offset, radius to diameter). */
const HALF_DIVISOR = 2;

/** A full circle, for `arc`. */
const FULL_CIRCLE_RADIANS = HALF_DIVISOR * Math.PI;

/** Opacity of the soft shadow drawn under the cursor. */
const CURSOR_SHADOW_OPACITY = 0.35;

/** One dot of the grid. */
export interface Dot {
  readonly x: number;
  readonly y: number;
  dx: number;
  dy: number;
  scale: number;
  opacity: number;
  /** 0 at rest, 1 under the cursor: blends the rest colour into the accent. */
  glow: number;
}

/** Cursor position in canvas pixels, or `null` when it is away or over content. */
export type Cursor = { readonly x: number; readonly y: number } | null;

/** Colours read from the theme variables. */
export interface DotGridColors {
  readonly rest: string;
  readonly active: string;
  readonly shadow: string;
}

/**
 * Lays the dots out on a regular grid; the count follows the screen area.
 *
 * @param width - Canvas width in CSS pixels.
 * @param height - Canvas height in CSS pixels.
 * @param settings - Dot grid settings.
 * @returns The dots, at rest.
 */
export function createDots(width: number, height: number, settings: DotGridSettings): Dot[] {
  const dots: Dot[] = [];
  const half = settings.spacingPx / HALF_DIVISOR;
  for (let y = half; y < height; y += settings.spacingPx) {
    for (let x = half; x < width; x += settings.spacingPx) {
      dots.push({ x, y, dx: 0, dy: 0, scale: 1, opacity: settings.restOpacity, glow: 0 });
    }
  }
  return dots;
}

/**
 * Moves a value toward its target by the inertia fraction.
 *
 * @param current - Current value.
 * @param target - Target value.
 * @param inertia - Fraction covered per frame (0–1).
 * @returns The new value.
 */
function approach(current: number, target: number, inertia: number): number {
  return current + (target - current) * inertia;
}

/**
 * Advances one dot by one frame.
 *
 * @param dot - Dot, updated in place.
 * @param cursor - Cursor position.
 * @param settings - Dot grid settings.
 * @returns `true` while the dot is still moving.
 */
function stepDot(dot: Dot, cursor: Cursor, settings: DotGridSettings): boolean {
  let influence = 0;
  let directionX = 0;
  let directionY = 0;
  if (cursor && settings.radiusPx > 0) {
    const distance = Math.hypot(dot.x - cursor.x, dot.y - cursor.y);
    if (distance < settings.radiusPx && distance > 0) {
      influence = 1 - distance / settings.radiusPx;
      directionX = (dot.x - cursor.x) / distance;
      directionY = (dot.y - cursor.y) / distance;
    }
  }
  const before = dot.dx + dot.dy + dot.scale + dot.opacity + dot.glow;
  dot.dx = approach(dot.dx, directionX * settings.pushPx * influence, settings.inertia);
  dot.dy = approach(dot.dy, directionY * settings.pushPx * influence, settings.inertia);
  dot.scale = approach(dot.scale, 1 + (settings.maxScale - 1) * influence, settings.inertia);
  const targetOpacity =
    settings.restOpacity + (settings.activeOpacity - settings.restOpacity) * influence;
  dot.opacity = approach(dot.opacity, targetOpacity, settings.inertia);
  dot.glow = approach(dot.glow, influence, settings.inertia);
  return Math.abs(dot.dx + dot.dy + dot.scale + dot.opacity + dot.glow - before) > REST_EPSILON;
}

/**
 * Advances every dot by one frame.
 *
 * @param dots - Dots, updated in place.
 * @param cursor - Cursor position.
 * @param settings - Dot grid settings.
 * @returns `true` while at least one dot is moving (the animation loop can stop otherwise).
 */
export function stepDots(dots: Dot[], cursor: Cursor, settings: DotGridSettings): boolean {
  let moving = false;
  for (const dot of dots) {
    moving = stepDot(dot, cursor, settings) || moving;
  }
  return moving;
}

/**
 * Draws the soft shadow that follows the cursor, as if it pressed into the surface.
 *
 * @param context - 2D context.
 * @param cursor - Cursor position.
 * @param settings - Dot grid settings.
 * @param colors - Theme colours.
 */
function drawCursorShadow(
  context: CanvasRenderingContext2D,
  cursor: Cursor,
  settings: DotGridSettings,
  colors: DotGridColors,
): void {
  if (!cursor || settings.radiusPx === 0) {
    return;
  }
  const gradient = context.createRadialGradient(
    cursor.x,
    cursor.y,
    0,
    cursor.x,
    cursor.y,
    settings.radiusPx,
  );
  gradient.addColorStop(0, colors.shadow);
  gradient.addColorStop(1, "transparent");
  context.globalAlpha = CURSOR_SHADOW_OPACITY;
  context.fillStyle = gradient;
  context.fillRect(
    cursor.x - settings.radiusPx,
    cursor.y - settings.radiusPx,
    settings.radiusPx * HALF_DIVISOR,
    settings.radiusPx * HALF_DIVISOR,
  );
}

/**
 * Draws the whole grid.
 *
 * @param context - 2D context (already scaled to the device pixel ratio).
 * @param dots - Dots.
 * @param cursor - Cursor position.
 * @param settings - Dot grid settings.
 * @param colors - Theme colours.
 */
export function drawDots(
  context: CanvasRenderingContext2D,
  dots: readonly Dot[],
  cursor: Cursor,
  settings: DotGridSettings,
  colors: DotGridColors,
): void {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  drawCursorShadow(context, cursor, settings, colors);
  for (const dot of dots) {
    context.globalAlpha = dot.opacity;
    context.fillStyle = dot.glow > settings.restOpacity ? colors.active : colors.rest;
    context.beginPath();
    context.arc(
      dot.x + dot.dx,
      dot.y + dot.dy,
      settings.dotSizePx * dot.scale,
      0,
      FULL_CIRCLE_RADIANS,
    );
    context.fill();
  }
  context.globalAlpha = 1;
}
