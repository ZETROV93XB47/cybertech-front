/**
 * Feature 003 US5 — « Ma carte » with a card saved at sign-up (T065): masked card, expiry
 * update kept after a reload, past expiry refused, deletion to the « aucune carte » state, axe.
 * The add and replace flow is in `bank-card-add.spec.ts` (T088).
 *
 * @see specs/003-account-orders/quickstart.md §3 US5
 */
import { expect, test } from "@playwright/test";

import { expectNoBlockingViolations } from "./support/a11y";
import { registerUser, signIn } from "./support/account";
import { chooseListOption } from "./support/listbox";

/** Path of « Ma carte ». */
const CARD_PATH = "/account/card";

test.beforeEach(() => {
  test.skip(
    test.info().project.name !== "chromium",
    "Card journeys register users: run them once, in the chromium project",
  );
});

test("the saved card is edited, kept after a reload, then deleted", async ({ page, context }) => {
  const email = await registerUser(context, { withBankCard: true });
  await signIn(page, email, CARD_PATH);
  await expect(page.getByRole("heading", { level: 1, name: "Ma carte" })).toBeVisible();
  await expect(page.getByTestId("card-visual")).toContainText("•••• •••• •••• 1111");
  await expect(page.locator("body")).not.toContainText("1111111111111111");
  await expectNoBlockingViolations(page);

  const edit = page.getByRole("region", { name: "Modifier le titulaire ou l'expiration" });
  // Option 0 is the current year: option 2 is two years ahead.
  await chooseListOption(page, edit, "Mois d'expiration", "01");
  await chooseListOption(page, edit, "Année d'expiration", { index: 2 });
  await edit.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("C'est enregistré : ta carte est à jour.")).toBeVisible();
  await page.reload();
  await expect(edit.getByRole("combobox", { name: "Mois d'expiration" })).toHaveText("01");

  await page.getByRole("button", { name: "Supprimer la carte" }).click();
  await page.getByRole("button", { name: "Oui, supprimer" }).click();
  await expect(page.getByRole("heading", { name: "Aucune carte enregistrée" })).toBeVisible();
  await expectNoBlockingViolations(page);
});

test("a past expiry is refused on the field", async ({ page, context }) => {
  const email = await registerUser(context, { withBankCard: true });
  await signIn(page, email, CARD_PATH);
  const edit = page.getByRole("region", { name: "Modifier le titulaire ou l'expiration" });
  // January of the current year (option 0) is past from February on.
  test.skip(new Date().getMonth() === 0, "January: the current month is not past yet");
  await chooseListOption(page, edit, "Mois d'expiration", "01");
  await chooseListOption(page, edit, "Année d'expiration", { index: 0 });
  await edit.getByRole("button", { name: "Enregistrer" }).click();
  await expect(edit.getByText(/Cette date est passée/)).toBeVisible();
});
