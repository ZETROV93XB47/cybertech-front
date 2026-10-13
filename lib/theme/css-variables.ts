/**
 * Turns the theme configuration into CSS variables (research R18).
 *
 * The root layout injects the result in a `<style>` tag on the server, so the first paint already
 * uses the right tokens. Variants follow the attributes set on `<html>` from the preferences:
 * `[data-accent="blue"]`, `[data-motion="soft"]`, `[data-effects="off"]`.
 * `styles/globals.css` maps Tailwind tokens to these variables and contains no value itself.
 *
 * Names avoid Tailwind's own theme namespaces (`--font-*`, `--radius-*`, `--shadow-*`): the
 * mapping `--font-display: var(--family-heading)` would otherwise reference itself.
 */
import {
  AccentVariant,
  EffectsLevel,
  MotionIntensity,
  ThemeDataAttribute,
} from "@/lib/enums/theme";

import type { AccentTokens, EffectsSettings, MotionTokens, ThemeConfig } from "./types";

/** Name of every CSS variable emitted, so no variable name is typed twice. */
export const CSS_VARIABLES = {
  bg: "--bg",
  surface: "--surface",
  surface2: "--surface-2",
  border: "--border",
  text: "--text",
  textMuted: "--text-muted",
  gold: "--gold",
  rose: "--rose",
  accent: "--accent-color",
  accentText: "--accent-text",
  onAccent: "--on-accent",
  accentGlow: "--accent-glow",
  gradientFrom: "--gradient-from",
  gradientTo: "--gradient-to",
  success: "--success",
  fontHeading: "--family-heading",
  fontBody: "--family-body",
  fontMono: "--family-mono",
  headingWeight: "--heading-weight",
  headingWeightStrong: "--heading-weight-strong",
  bodyWeight: "--body-weight",
  headingLetterSpacing: "--heading-letter-spacing",
  bodyLineHeight: "--body-line-height",
  radiusCard: "--radius",
  radiusButton: "--shape-radius-button",
  radiusField: "--shape-radius-field",
  borderWidth: "--border-width",
  glassOpacity: "--glass-opacity",
  glassBlur: "--glass-blur",
  focusRingWidth: "--focus-ring-width",
  focusRingOffset: "--focus-ring-offset",
  ctaGradientAngle: "--cta-gradient-angle",
  shimmerAccentMix: "--shimmer-accent-mix",
  shadowCard: "--elevation-card",
  shadowCardHover: "--elevation-card-hover",
  shadowCta: "--elevation-cta",
  shadowNeumorphicRaised: "--elevation-neumorphic-raised",
  shadowNeumorphicInset: "--elevation-neumorphic-inset",
  durationFast: "--duration-fast",
  durationBase: "--duration-base",
  durationSlow: "--duration-slow",
  revealOffset: "--reveal-offset",
  stagger: "--stagger",
  easing: "--easing",
  cardHoverLift: "--card-hover-lift",
  auroraOpacity: "--aurora-opacity",
  containerMaxWidth: "--container-max-width",
  headerHeight: "--header-height",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
} as const;

/** A list of `[variable, value]` pairs. */
type Declarations = readonly (readonly [string, string | number])[];

/**
 * Formats declarations as a CSS rule.
 *
 * @param selector - CSS selector.
 * @param declarations - Variables and values.
 * @returns The CSS rule.
 */
function rule(selector: string, declarations: Declarations): string {
  const body = declarations.map(([name, value]) => `${name}:${String(value)};`).join("");
  return `${selector}{${body}}`;
}

/**
 * Builds the selector of a variant attribute on the root element.
 *
 * @param attribute - Data attribute set on `<html>`.
 * @param value - Variant value.
 * @returns E.g. `:root[data-accent="blue"]`.
 */
function variantSelector(attribute: ThemeDataAttribute, value: string): string {
  return `:root[${attribute}="${value}"]`;
}

/**
 * Accent declarations of one variant.
 *
 * @param tokens - Accent tokens.
 * @returns The declarations.
 */
function accentDeclarations(tokens: AccentTokens): Declarations {
  return [
    [CSS_VARIABLES.accent, tokens.accent],
    [CSS_VARIABLES.accentText, tokens.accentText],
    [CSS_VARIABLES.onAccent, tokens.onAccent],
    [CSS_VARIABLES.accentGlow, tokens.accentGlow],
    [CSS_VARIABLES.gradientFrom, tokens.gradientFrom],
    [CSS_VARIABLES.gradientTo, tokens.gradientTo],
    [CSS_VARIABLES.success, tokens.success],
  ];
}

/**
 * Motion declarations of one intensity.
 *
 * @param tokens - Motion tokens.
 * @returns The declarations.
 */
function motionDeclarations(tokens: MotionTokens): Declarations {
  return [
    [CSS_VARIABLES.durationFast, `${tokens.durationFastMs}ms`],
    [CSS_VARIABLES.durationBase, `${tokens.durationBaseMs}ms`],
    [CSS_VARIABLES.durationSlow, `${tokens.durationSlowMs}ms`],
    [CSS_VARIABLES.revealOffset, `${tokens.revealOffsetPx}px`],
    [CSS_VARIABLES.stagger, `${tokens.staggerMs}ms`],
    [CSS_VARIABLES.easing, `cubic-bezier(${tokens.easing.join(",")})`],
  ];
}

/**
 * CSS-visible declarations of one effects level (the rest is read by effect components).
 *
 * @param settings - Effects settings.
 * @returns The declarations.
 */
function effectsDeclarations(settings: EffectsSettings): Declarations {
  return [
    [CSS_VARIABLES.cardHoverLift, settings.cardHoverLift],
    [CSS_VARIABLES.auroraOpacity, settings.aurora.opacity],
  ];
}

/**
 * Declarations of the values that never change with preferences.
 *
 * @param theme - Theme configuration.
 * @returns The declarations.
 */
function baseDeclarations(theme: ThemeConfig): Declarations {
  const { palette, typography, shape, shadows, layout } = theme;
  return [
    [CSS_VARIABLES.bg, palette.bg],
    [CSS_VARIABLES.surface, palette.surface],
    [CSS_VARIABLES.surface2, palette.surface2],
    [CSS_VARIABLES.border, palette.border],
    [CSS_VARIABLES.text, palette.text],
    [CSS_VARIABLES.textMuted, palette.textMuted],
    [CSS_VARIABLES.gold, palette.gold],
    [CSS_VARIABLES.rose, palette.rose],
    [CSS_VARIABLES.popover, palette.surface2],
    [CSS_VARIABLES.popoverForeground, palette.text],
    [CSS_VARIABLES.fontHeading, typography.fontHeading],
    [CSS_VARIABLES.fontBody, typography.fontBody],
    [CSS_VARIABLES.fontMono, typography.fontMono],
    [CSS_VARIABLES.headingWeight, typography.headingWeight],
    [CSS_VARIABLES.headingWeightStrong, typography.headingWeightStrong],
    [CSS_VARIABLES.bodyWeight, typography.bodyWeight],
    [CSS_VARIABLES.headingLetterSpacing, typography.headingLetterSpacing],
    [CSS_VARIABLES.bodyLineHeight, typography.bodyLineHeight],
    [CSS_VARIABLES.radiusCard, shape.radiusCard],
    [CSS_VARIABLES.radiusButton, shape.radiusButton],
    [CSS_VARIABLES.radiusField, shape.radiusField],
    [CSS_VARIABLES.borderWidth, shape.borderWidth],
    [CSS_VARIABLES.glassOpacity, shape.glassOpacity],
    [CSS_VARIABLES.glassBlur, shape.glassBlur],
    [CSS_VARIABLES.focusRingWidth, shape.focusRingWidth],
    [CSS_VARIABLES.focusRingOffset, shape.focusRingOffset],
    [CSS_VARIABLES.ctaGradientAngle, shape.ctaGradientAngle],
    [CSS_VARIABLES.shimmerAccentMix, shape.shimmerAccentMix],
    [CSS_VARIABLES.shadowCard, shadows.card],
    [CSS_VARIABLES.shadowCardHover, shadows.cardHover],
    [CSS_VARIABLES.shadowCta, shadows.cta],
    [CSS_VARIABLES.shadowNeumorphicRaised, shadows.neumorphicRaised],
    [CSS_VARIABLES.shadowNeumorphicInset, shadows.neumorphicInset],
    [CSS_VARIABLES.containerMaxWidth, layout.containerMaxWidth],
    [CSS_VARIABLES.headerHeight, layout.headerHeight],
  ];
}

/**
 * Builds the complete theme stylesheet: defaults on `:root`, then one rule per variant.
 *
 * @param theme - Theme configuration.
 * @returns CSS text to inject in `<head>`.
 */
export function buildThemeCss(theme: ThemeConfig): string {
  const root = rule(":root", [
    ...baseDeclarations(theme),
    ...accentDeclarations(theme.accents[theme.defaultAccent]),
    ...motionDeclarations(theme.motion[MotionIntensity.NORMAL]),
    ...effectsDeclarations(theme.effects[EffectsLevel.FULL]),
  ]);
  const accents = Object.values(AccentVariant).map((variant) =>
    rule(
      variantSelector(ThemeDataAttribute.ACCENT, variant),
      accentDeclarations(theme.accents[variant]),
    ),
  );
  const motions = Object.values(MotionIntensity).map((intensity) =>
    rule(
      variantSelector(ThemeDataAttribute.MOTION, intensity),
      motionDeclarations(theme.motion[intensity]),
    ),
  );
  const effects = Object.values(EffectsLevel).map((level) =>
    rule(
      variantSelector(ThemeDataAttribute.EFFECTS, level),
      effectsDeclarations(theme.effects[level]),
    ),
  );
  return [root, ...accents, ...motions, ...effects].join("\n");
}
