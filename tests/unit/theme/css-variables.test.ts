// @vitest-environment node
import { describe, expect, it } from "vitest";

import { AccentVariant, EffectsLevel, MotionIntensity } from "@/lib/enums/theme";
import { buildThemeCss, CSS_VARIABLES } from "@/lib/theme/css-variables";
import { THEME } from "@/lib/theme/theme.config";

const css = buildThemeCss(THEME);

describe("buildThemeCss", () => {
  it("emits every variable on :root", () => {
    const root = css.split("\n")[0] ?? "";
    for (const name of Object.values(CSS_VARIABLES)) {
      expect(root).toContain(`${name}:`);
    }
  });

  it("uses the default accent and the normal motion on :root", () => {
    const root = css.split("\n")[0] ?? "";
    expect(root).toContain(`--accent-color:${THEME.accents[THEME.defaultAccent].accent};`);
    expect(root).toContain(
      `--duration-base:${THEME.motion[MotionIntensity.NORMAL].durationBaseMs}ms;`,
    );
  });

  it("emits one block per accent, motion and effects variant", () => {
    for (const variant of Object.values(AccentVariant)) {
      expect(css).toContain(
        `:root[data-accent="${variant}"]{--accent-color:${THEME.accents[variant].accent};`,
      );
    }
    for (const intensity of Object.values(MotionIntensity)) {
      expect(css).toContain(`:root[data-motion="${intensity}"]{`);
    }
    for (const level of Object.values(EffectsLevel)) {
      expect(css).toContain(`:root[data-effects="${level}"]{`);
    }
  });

  it("contains no undefined or NaN value", () => {
    expect(css).not.toMatch(/undefined|NaN|null/);
  });

  it("follows a change of the configuration without touching any component (SC-012)", () => {
    const changed = buildThemeCss({
      ...THEME,
      accents: {
        ...THEME.accents,
        [AccentVariant.VIOLET]: { ...THEME.accents[AccentVariant.VIOLET], accent: "#9A8CFF" },
      },
    });
    expect(changed).toContain("--accent-color:#9A8CFF;");
  });
});
