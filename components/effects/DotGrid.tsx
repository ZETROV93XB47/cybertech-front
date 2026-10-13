"use client";

/**
 * Reactive dot grid behind the page (spec annex « Effet signature »), Canvas 2D, desktop only.
 *
 * - Parameters from `THEME.effects[level].dotGrid` through `useEffectiveEffects()`; nothing is
 *   rendered when the effective level turns the grid off (preference OFF or system reduced
 *   motion).
 * - The animation loop runs only while dots move: once they are back at rest, no frame is
 *   requested (constitution IX, no long task while idle). It pauses when the tab is hidden.
 * - The cursor has no effect over content (cards, text, controls): the grid only lives on the
 *   background.
 */
import { useEffect, useRef, type ReactNode } from "react";

import { useEffectiveEffects } from "@/features/preferences/PreferencesProvider";
import { CSS_VARIABLES } from "@/lib/theme/css-variables";
import type { DotGridSettings } from "@/lib/theme/types";

import {
  createDots,
  drawDots,
  stepDots,
  type Cursor,
  type Dot,
  type DotGridColors,
} from "./dot-grid-engine";

/** Elements over which the grid does not react (content, not background). */
export const DOT_GRID_EXCLUDE_SELECTOR =
  "[data-dotgrid-exclude], .glass, a, button, input, select, textarea, p, h1, h2, h3, img, label";

/** Theme attributes whose change means new colours. */
const THEME_ATTRIBUTES = ["data-accent"];

/**
 * Reads the grid colours from the theme variables.
 *
 * @returns Rest, active and shadow colours.
 */
function readColors(): DotGridColors {
  const style = getComputedStyle(document.documentElement);
  return {
    rest: style.getPropertyValue(CSS_VARIABLES.border).trim(),
    active: style.getPropertyValue(CSS_VARIABLES.accent).trim(),
    shadow: style.getPropertyValue(CSS_VARIABLES.bg).trim(),
  };
}

/** Mutable state of one running grid. */
interface GridState {
  dots: Dot[];
  cursor: Cursor;
  colors: DotGridColors;
  frame: number | null;
}

/**
 * Sizes the canvas to the viewport and the device pixel ratio, and lays the dots out again.
 *
 * @param canvas - Canvas element.
 * @param context - Its 2D context.
 * @param state - Grid state, updated.
 * @param settings - Dot grid settings.
 */
function resize(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  state: GridState,
  settings: DotGridSettings,
): void {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * ratio);
  canvas.height = Math.round(window.innerHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  state.dots = createDots(window.innerWidth, window.innerHeight, settings);
}

/**
 * Starts the grid on a canvas.
 *
 * @param canvas - Canvas element.
 * @param settings - Dot grid settings of the effective level.
 * @returns The cleanup function.
 */
export function startDotGrid(canvas: HTMLCanvasElement, settings: DotGridSettings): () => void {
  const context = canvas.getContext("2d");
  if (!context) {
    return () => undefined;
  }
  const state: GridState = { dots: [], cursor: null, colors: readColors(), frame: null };
  const draw = (): void => {
    drawDots(context, state.dots, state.cursor, settings, state.colors);
  };
  const loop = (): void => {
    const moving = stepDots(state.dots, state.cursor, settings);
    draw();
    state.frame = moving || state.cursor ? requestAnimationFrame(loop) : null;
  };
  const wake = (): void => {
    if (settings.interactive && state.frame === null && !document.hidden) {
      state.frame = requestAnimationFrame(loop);
    }
  };
  return listen(canvas, context, state, settings, { draw, wake });
}

/**
 * Wires the browser events of a running grid.
 *
 * @param canvas - Canvas element.
 * @param context - Its 2D context.
 * @param state - Grid state.
 * @param settings - Dot grid settings.
 * @param actions - Redraw and wake-up functions.
 * @returns The cleanup function.
 */
function listen(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  state: GridState,
  settings: DotGridSettings,
  actions: { readonly draw: () => void; readonly wake: () => void },
): () => void {
  const onPointerMove = (event: PointerEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    state.cursor = target?.closest(DOT_GRID_EXCLUDE_SELECTOR)
      ? null
      : { x: event.clientX, y: event.clientY };
    actions.wake();
  };
  const onLeave = (): void => {
    state.cursor = null;
    actions.wake();
  };
  const onResize = (): void => {
    resize(canvas, context, state, settings);
    actions.draw();
  };
  const onVisibility = (): void => {
    if (document.hidden && state.frame !== null) {
      cancelAnimationFrame(state.frame);
      state.frame = null;
    }
  };
  const observer = new MutationObserver(() => {
    state.colors = readColors();
    actions.draw();
  });
  observer.observe(document.documentElement, { attributeFilter: THEME_ATTRIBUTES });
  onResize();
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    if (state.frame !== null) {
      cancelAnimationFrame(state.frame);
    }
    observer.disconnect();
    window.removeEventListener("pointermove", onPointerMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/**
 * Background dot grid.
 *
 * @returns The canvas, or nothing when the effective effects level turns it off.
 */
export function DotGrid(): ReactNode {
  const settings = useEffectiveEffects().settings.dotGrid;
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!settings.enabled || !canvas.current) {
      return undefined;
    }
    return startDotGrid(canvas.current, settings);
  }, [settings]);
  if (!settings.enabled) {
    return null;
  }
  return (
    <canvas
      ref={canvas}
      aria-hidden
      data-testid="dot-grid"
      className="pointer-events-none fixed inset-0 -z-10 size-full"
    />
  );
}
