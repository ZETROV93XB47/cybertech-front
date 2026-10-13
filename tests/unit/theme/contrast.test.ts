// @vitest-environment node
import { describe, expect, it } from "vitest";

import { AccentVariant } from "@/lib/enums/theme";
import { AA_BODY_TEXT_RATIO, AA_NON_TEXT_RATIO, contrastRatio } from "@/lib/theme/contrast";
import { THEME } from "@/lib/theme/theme.config";

const { palette } = THEME;
const SURFACES = { bg: palette.bg, surface: palette.surface, surface2: palette.surface2 };

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("rejects a non-hex colour", () => {
    expect(() => contrastRatio("rgba(0,0,0,1)", "#FFFFFF")).toThrow();
  });
});

describe("every theme combination meets WCAG 2.1 AA (SC-011)", () => {
  const textRoles = {
    text: palette.text,
    textMuted: palette.textMuted,
    gold: palette.gold,
    rose: palette.rose,
  };

  for (const [surfaceName, surface] of Object.entries(SURFACES)) {
    for (const [role, colour] of Object.entries(textRoles)) {
      it(`${role} on ${surfaceName} ≥ 4.5:1`, () => {
        expect(contrastRatio(colour, surface)).toBeGreaterThanOrEqual(AA_BODY_TEXT_RATIO);
      });
    }
  }

  for (const variant of Object.values(AccentVariant)) {
    const tokens = THEME.accents[variant];

    for (const [surfaceName, surface] of Object.entries(SURFACES)) {
      it(`${variant}: accentText and success on ${surfaceName} ≥ 4.5:1, focus ring ≥ 3:1`, () => {
        expect(contrastRatio(tokens.accentText, surface)).toBeGreaterThanOrEqual(
          AA_BODY_TEXT_RATIO,
        );
        expect(contrastRatio(tokens.success, surface)).toBeGreaterThanOrEqual(AA_BODY_TEXT_RATIO);
        expect(contrastRatio(tokens.accentText, surface)).toBeGreaterThanOrEqual(AA_NON_TEXT_RATIO);
      });
    }

    it(`${variant}: onAccent on accent and on both gradient ends ≥ 4.5:1`, () => {
      for (const fill of [tokens.accent, tokens.gradientFrom, tokens.gradientTo]) {
        expect(contrastRatio(tokens.onAccent, fill)).toBeGreaterThanOrEqual(AA_BODY_TEXT_RATIO);
      }
    });

    it(`${variant}: success differs from the accent`, () => {
      expect(tokens.success).not.toBe(tokens.accent);
    });
  }
});
