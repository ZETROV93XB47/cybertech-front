/**
 * Feature 003 US4 — « Mon profil »: the city edited in the profile is kept after a reload and
 * prefills the checkout; a one-letter first name is refused before anything is sent; the page
 * has no blocking accessibility violation (quickstart §3 US4).
 *
 * Runs against the real local backend and Keycloak, on port 3000, in the `chromium` project only
 * (fresh users, 5 registrations per minute and per IP).
 */
import { expect, test } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";
import { firstProductPaths, registerUser, signIn } from "./support/account";

const PROFILE_PATH = "/account/profile";

/** City typed in the profile; unique enough not to match the registration address. */
const NEW_CITY = "Montpellier";

test.beforeEach(() => {
  test.skip(
    test.info().project.name !== "chromium",
    "Profile journeys register users: run them once, in the chromium project",
  );
});

test("the edited city is kept and prefills the checkout", async ({ page, context }) => {
  const email = await registerUser(context);
  await signIn(page, email, PROFILE_PATH);
  await expect(page.getByRole("heading", { level: 1, name: "Mon profil" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByLabel("Téléphone")).toHaveValue("");
  await expectNoBlockingViolations(page);

  await page.getByLabel("Ville").fill(NEW_CITY);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "ton profil est à jour" })).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Ville")).toHaveValue(NEW_CITY);
  await expect(page.getByText(new RegExp(`${NEW_CITY}, France`))).toBeVisible();

  const [path = ""] = await firstProductPaths(page, 1);
  await page.goto(path);
  await page.getByRole("button", { name: "Ajouter au panier" }).first().click();
  await expect(page.getByRole("status").filter({ hasText: "ajouté à ton panier" })).toBeVisible();
  await page.goto("/checkout");
  await expect(page.getByLabel("Ville")).toHaveValue(NEW_CITY);
});

test("a one-letter first name is refused on the field", async ({ page, context }) => {
  const email = await registerUser(context);
  await signIn(page, email, PROFILE_PATH);
  const firstName = page.getByLabel("Prénom");
  await firstName.fill("C");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(firstName).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Entre 2 et 50 caractères.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Prénom")).not.toHaveValue("C");
});
