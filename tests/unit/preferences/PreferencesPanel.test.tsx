import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PreferencesPanel } from "@/features/preferences/components/PreferencesPanel";
import { PreferencesProvider } from "@/features/preferences/PreferencesProvider";
import { DEFAULT_PREFERENCES } from "@/lib/schemas/preferences";

import { installMatchMedia } from "../../helpers/match-media";

async function openPanel(reducedMotion = false) {
  installMatchMedia(reducedMotion);
  const user = userEvent.setup();
  const view = render(
    <PreferencesProvider initialPreferences={DEFAULT_PREFERENCES}>
      <PreferencesPanel />
    </PreferencesProvider>,
  );
  await user.click(screen.getByRole("button", { name: "Préférences" }));
  return { user, view };
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-accent");
});

describe("PreferencesPanel", () => {
  it("offers labelled radio groups and a sound switch", async () => {
    await openPanel();
    expect(screen.getByRole("radiogroup", { name: "Effets visuels" })).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: "Intensité des animations" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Couleur d'accent" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Sons d'interface" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "Violet" })).toBeChecked();
  });

  // Keyboard operation (arrows in the radio groups) is checked in a real browser by
  // tests/e2e/preferences.spec.ts: jsdom does not reproduce Radix roving focus.
  it("applies the chosen accent to <html> at once", async () => {
    const { user } = await openPanel();
    await user.click(screen.getByRole("radio", { name: "Bleu" }));
    expect(screen.getByRole("radio", { name: "Bleu" })).toBeChecked();
    expect(document.documentElement.getAttribute("data-accent")).toBe("blue");
  });

  it("tells when the system asks for less motion", async () => {
    await openPanel(true);
    expect(
      screen.getByText("Ton système demande moins d'animations, on les garde figées."),
    ).toBeInTheDocument();
  });

  it("resets to the defaults", async () => {
    const { user } = await openPanel();
    await user.click(screen.getByRole("radio", { name: "Cyan" }));
    await user.click(screen.getByRole("button", { name: "Réinitialiser" }));
    expect(screen.getByRole("radio", { name: "Violet" })).toBeChecked();
  });

  it("has no accessibility violation", async () => {
    await openPanel();
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
