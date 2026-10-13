/**
 * User-facing text of the « Préférences » panel (French, tutoiement) — constitution XI.
 *
 * @see specs/001-catalog-auth-cart/spec.md US5, FR-033 to FR-038
 */
import { AccentVariant, EffectsLevel, MotionIntensity } from "@/lib/enums/theme";

/** Text of the panel. */
export const PREFERENCES_MESSAGES = {
  trigger: "Préférences",
  title: "Préférences",
  description: "Règle le confort visuel de la boutique. Tes choix sont gardés sur ce navigateur.",
  close: "Fermer les préférences",
  effectsLegend: "Effets visuels",
  effectsHint:
    "Grille de points, halos, cartes inclinables, boutons magnétiques, défilement fluide.",
  motionLegend: "Intensité des animations",
  accentLegend: "Couleur d'accent",
  accentHint: "Les prix restent dorés, quelle que soit la couleur.",
  soundLabel: "Sons d'interface",
  soundHint: "De petits sons discrets à l'ajout au panier.",
  reducedMotionNotice: "Ton système demande moins d'animations, on les garde figées.",
  reset: "Réinitialiser",
  saved: "Préférences enregistrées.",
  resetDone: "Préférences remises par défaut.",
} as const;

/** Labels of the effects levels. */
export const EFFECTS_LABELS: Readonly<Record<EffectsLevel, string>> = {
  [EffectsLevel.FULL]: "Complets",
  [EffectsLevel.REDUCED]: "Réduits",
  [EffectsLevel.OFF]: "Désactivés",
};

/** Labels of the motion intensities. */
export const MOTION_LABELS: Readonly<Record<MotionIntensity, string>> = {
  [MotionIntensity.NORMAL]: "Normale",
  [MotionIntensity.SOFT]: "Douce",
};

/** Labels of the accent variants. */
export const ACCENT_LABELS: Readonly<Record<AccentVariant, string>> = {
  [AccentVariant.VIOLET]: "Violet",
  [AccentVariant.BLUE]: "Bleu",
  [AccentVariant.CYAN]: "Cyan",
};
