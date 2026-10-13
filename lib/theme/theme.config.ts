/**
 * Theme configuration — the single source of every visual value (constitution XIII).
 *
 * Changing a value here changes it everywhere: `css-variables.ts` turns this object into CSS
 * variables, Tailwind tokens map to those variables, and effects read their parameters from
 * `THEME.effects`. Components never contain a raw colour, size or duration.
 *
 * Palette and rules come from the « Aurora Glow » annex of the spec; contrast choices are
 * explained in research R18 and checked by `tests/unit/theme/contrast.test.ts`.
 */
import { AccentVariant, EffectsLevel, MotionIntensity, UiSound } from "@/lib/enums/theme";

import type { EffectsSettings, ThemeConfig } from "./types";

/** Night blue used as text on every accent fill (5.1 to 13:1, research R18). */
const ON_ACCENT = "#0A0E1F";

/** Violet of the annex, default accent. */
const VIOLET = "#8B7CF6";

/** Blue of the annex: fills only; 4.19:1 on `surface2` is too low for text. */
const BLUE = "#4F7BFF";

/** Lighter blue for blue text and focus rings (5.22:1 on `surface2`). */
const BLUE_TEXT = "#6B8FFF";

/** Cyan of the annex: success / active state, and the third accent. */
const CYAN = "#5EEAD4";

/** Mint success colour used only with the cyan accent, so success stays distinct. */
const MINT = "#7BE0A8";

/** Shared ease-out (fast start, soft landing). */
const EASE_OUT: readonly [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Effects with every decoration switched off (also the reduced-motion fallback). */
const EFFECTS_OFF: EffectsSettings = {
  dotGrid: {
    enabled: false,
    interactive: false,
    radiusPx: 0,
    spacingPx: 28,
    dotSizePx: 1.2,
    maxScale: 1,
    pushPx: 0,
    inertia: 1,
    restOpacity: 0,
    activeOpacity: 0,
  },
  aurora: {
    enabled: false,
    animated: false,
    blobCount: 0,
    minCycleSeconds: 0,
    maxCycleSeconds: 0,
    blurPx: 0,
    opacity: 0,
    followStrength: 0,
  },
  tilt: { enabled: false, maxDeg: 0, perspectivePx: 800 },
  magnetic: { enabled: false, strength: 0, radiusPx: 0 },
  smoothScroll: { enabled: false, durationSeconds: 0 },
  galleryZoom: { enabled: false, scale: 1 },
  viewTransitions: { enabled: false },
  liveTitle: { enabled: false, weightMin: 600, weightMax: 600, radiusPx: 0 },
  cardHoverLift: "0px",
};

/** The theme. */
export const THEME = {
  palette: {
    bg: "#0A0E1F",
    surface: "#121833",
    surface2: "#1A2142",
    border: "#2A3150",
    text: "#E6E8F2",
    textMuted: "#8B93B0",
    gold: "#D4AF6A",
    rose: "#F08BB8",
  },
  defaultAccent: AccentVariant.VIOLET,
  accents: {
    [AccentVariant.VIOLET]: {
      accent: VIOLET,
      accentText: VIOLET,
      onAccent: ON_ACCENT,
      accentGlow: "rgba(139, 124, 246, 0.35)",
      gradientFrom: VIOLET,
      gradientTo: BLUE,
      success: CYAN,
    },
    [AccentVariant.BLUE]: {
      accent: BLUE,
      accentText: BLUE_TEXT,
      onAccent: ON_ACCENT,
      accentGlow: "rgba(79, 123, 255, 0.35)",
      gradientFrom: BLUE,
      gradientTo: VIOLET,
      success: CYAN,
    },
    [AccentVariant.CYAN]: {
      accent: CYAN,
      accentText: CYAN,
      onAccent: ON_ACCENT,
      accentGlow: "rgba(94, 234, 212, 0.3)",
      gradientFrom: CYAN,
      gradientTo: BLUE,
      success: MINT,
    },
  },
  typography: {
    fontHeading: "var(--font-sora)",
    fontBody: "var(--font-inter)",
    fontMono: "var(--font-jetbrains-mono)",
    headingWeight: 500,
    headingWeightStrong: 600,
    bodyWeight: 400,
    headingLetterSpacing: "-0.02em",
    bodyLineHeight: 1.65,
  },
  shape: {
    radiusCard: "20px",
    radiusButton: "16px",
    radiusField: "16px",
    borderWidth: "1px",
    glassOpacity: 0.7,
    glassBlur: "12px",
    focusRingWidth: "2px",
    focusRingOffset: "2px",
    ctaGradientAngle: "135deg",
    shimmerAccentMix: "12%",
  },
  shadows: {
    card: "0 8px 32px rgba(139, 124, 246, 0.10)",
    cardHover: "0 16px 48px rgba(139, 124, 246, 0.22)",
    cta: "0 0 28px var(--accent-glow)",
    neumorphicRaised: "6px 6px 14px rgba(5, 7, 16, 0.55), -4px -4px 12px rgba(139, 124, 246, 0.07)",
    neumorphicInset:
      "inset 3px 3px 8px rgba(5, 7, 16, 0.6), inset -3px -3px 8px rgba(139, 124, 246, 0.06)",
  },
  motion: {
    [MotionIntensity.NORMAL]: {
      durationFastMs: 150,
      durationBaseMs: 250,
      durationSlowMs: 350,
      revealOffsetPx: 12,
      slideOffsetPx: 32,
      staggerMs: 60,
      easing: EASE_OUT,
    },
    [MotionIntensity.SOFT]: {
      durationFastMs: 220,
      durationBaseMs: 380,
      durationSlowMs: 520,
      revealOffsetPx: 6,
      slideOffsetPx: 16,
      staggerMs: 90,
      easing: EASE_OUT,
    },
  },
  effects: {
    [EffectsLevel.FULL]: {
      dotGrid: {
        enabled: true,
        interactive: true,
        radiusPx: 120,
        spacingPx: 28,
        dotSizePx: 1.2,
        maxScale: 1.8,
        pushPx: 10,
        inertia: 0.12,
        restOpacity: 0.08,
        activeOpacity: 0.6,
      },
      aurora: {
        enabled: true,
        animated: true,
        blobCount: 3,
        minCycleSeconds: 20,
        maxCycleSeconds: 30,
        blurPx: 120,
        opacity: 0.35,
        followStrength: 0.04,
      },
      tilt: { enabled: true, maxDeg: 8, perspectivePx: 800 },
      magnetic: { enabled: true, strength: 0.25, radiusPx: 80 },
      smoothScroll: { enabled: true, durationSeconds: 1.1 },
      galleryZoom: { enabled: true, scale: 1.8 },
      viewTransitions: { enabled: true },
      liveTitle: { enabled: true, weightMin: 500, weightMax: 650, radiusPx: 220 },
      cardHoverLift: "-4px",
    },
    [EffectsLevel.REDUCED]: {
      dotGrid: {
        enabled: true,
        interactive: false,
        radiusPx: 0,
        spacingPx: 28,
        dotSizePx: 1.2,
        maxScale: 1,
        pushPx: 0,
        inertia: 1,
        restOpacity: 0.08,
        activeOpacity: 0.08,
      },
      aurora: {
        enabled: true,
        animated: true,
        blobCount: 2,
        minCycleSeconds: 40,
        maxCycleSeconds: 60,
        blurPx: 140,
        opacity: 0.25,
        followStrength: 0,
      },
      tilt: { enabled: false, maxDeg: 0, perspectivePx: 800 },
      magnetic: { enabled: false, strength: 0, radiusPx: 0 },
      smoothScroll: { enabled: false, durationSeconds: 0 },
      galleryZoom: { enabled: true, scale: 1.4 },
      viewTransitions: { enabled: true },
      liveTitle: { enabled: false, weightMin: 600, weightMax: 600, radiusPx: 0 },
      cardHoverLift: "-2px",
    },
    [EffectsLevel.OFF]: EFFECTS_OFF,
  },
  sound: {
    volume: 0.08,
    tones: {
      [UiSound.ADD_TO_CART]: { frequencyHz: 880, durationMs: 120, waveform: "sine" },
      [UiSound.MERGE_SUCCESS]: { frequencyHz: 740, durationMs: 180, waveform: "sine" },
      [UiSound.ERROR]: { frequencyHz: 220, durationMs: 200, waveform: "triangle" },
    },
  },
  media: {
    // Grid of 3 columns inside the 1200px container, 2 columns below the `lg` breakpoint.
    card: { width: 480, height: 360, sizes: "(min-width: 1024px) 384px, 50vw" },
    gallery: { width: 800, height: 600, sizes: "(min-width: 1024px) 680px, 100vw" },
    thumbnail: { width: 120, height: 90, sizes: "96px" },
  },
  layout: {
    containerMaxWidth: "1200px",
    headerHeight: "64px",
  },
} as const satisfies ThemeConfig;
