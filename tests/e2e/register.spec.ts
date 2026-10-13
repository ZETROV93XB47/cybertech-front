/**
 * US2 — create an account (spec acceptance scenarios 1 to 4, FR-011 to FR-014).
 *
 * Runs against the real local backend and Keycloak, on port 3000. The successful journeys
 * register real users (5 per minute and per IP), so they run once, in the `chromium` project.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { fillKeycloakForm, registerUser } from "./support/account";

const PASSWORD = "Passw0rd!";

/** axe impacts that fail the test. */
const BLOCKING_IMPACTS = new Set(["serious", "critical"]);

/** Unique suffix: the backend derives the Keycloak username from the names. */
function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1_000)}`;
}

async function expectNoBlockingViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) =>
    BLOCKING_IMPACTS.has(violation.impact ?? ""),
  );
  expect(blocking.map((violation) => violation.id)).toEqual([]);
}

/** Counts the submissions of the registration Server Action. */
function countSubmissions(page: Page): () => number {
  let count = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/register") {
      count += 1;
    }
  });
  return () => count;
}

test.describe("registration form", () => {
  test("an invalid email is reported on the field without any request", async ({ page }) => {
    const submissions = countSubmissions(page);
    await page.goto("/register");
    await page.getByLabel("Email").fill("pas-un-email");
    await page.getByLabel("Email").blur();
    await expect(page.getByText("Vérifie ton adresse email.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");

    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByLabel("Prénom")).toBeFocused();
    await expect(page.getByText("Entre 2 et 50 caractères.").first()).toBeVisible();
    expect(submissions()).toBe(0);
    await expectNoBlockingViolations(page);
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("the server answers with the field errors and keeps the typed values", async ({
      page,
    }) => {
      await page.goto("/register");
      await page.getByLabel("Prénom").fill("Camille");
      await page.getByLabel("Email").fill("pas-un-email");
      await page.getByLabel("Mot de passe").fill("court");
      await page.getByRole("button", { name: "Créer mon compte" }).click();
      await expect(page.getByRole("alert")).toHaveText("Certains champs sont à corriger.");
      await expect(page.getByText("Vérifie ton adresse email.")).toBeVisible();
      await expect(page.getByLabel("Prénom")).toHaveValue("Camille");
      await expect(page.getByLabel("Mot de passe")).toHaveValue("");
    });
  });

  test("the page has no serious accessibility violation", async ({ page }) => {
    await page.goto("/register");
    await expectNoBlockingViolations(page);
  });
});

test.describe("account creation", () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== "chromium",
      "Creates real accounts: run once, in the chromium project",
    );
  });

  test("a keyboard-only visitor creates an account, then can sign in", async ({ page }) => {
    const suffix = uniqueSuffix();
    const email = `e2e.register.${suffix}@example.com`;
    await page.goto("/register");
    await page.getByLabel("Prénom").focus();
    await page.keyboard.type("Camille");
    await page.keyboard.press("Tab");
    await page.keyboard.type(`Clavier${suffix}`);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await expect(page.getByRole("radio", { name: "Femme" })).toBeChecked();
    for (const [label, value] of [
      ["Email", email],
      ["Téléphone", "+33600000000"],
      ["Rue", "1 rue du Test"],
      ["Code postal", "75001"],
      ["Ville", "Paris"],
      ["Pays", "France"],
    ] as const) {
      await page.getByLabel(label).focus();
      await page.keyboard.type(value);
    }
    await page.getByLabel("Comment préfères-tu qu'on te contacte ?").focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByLabel("Comment préfères-tu qu'on te contacte ?")).toHaveValue("EMAIL");
    await page.getByLabel("Mot de passe").focus();
    await page.keyboard.type(PASSWORD);
    await page.keyboard.press("Enter");

    await expect(page.getByRole("heading", { name: "Ton compte est prêt" })).toBeVisible();
    await page.getByRole("status").getByRole("link", { name: "Se connecter" }).click();
    await fillKeycloakForm(page, email);
    await page.waitForURL((url) => url.port === "3000" && url.pathname === "/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Content de te revoir, Camille",
    );
  });

  test("an email already in use is reported on the email field", async ({ page, context }) => {
    const email = await registerUser(context);
    await page.goto("/register");
    for (const [label, value] of [
      ["Prénom", "Camille"],
      ["Nom", `Doublon${uniqueSuffix()}`],
      ["Email", email],
      ["Téléphone", "+33600000000"],
      ["Rue", "1 rue du Test"],
      ["Code postal", "75001"],
      ["Ville", "Paris"],
      ["Pays", "France"],
      ["Mot de passe", PASSWORD],
    ] as const) {
      await page.getByLabel(label, { exact: true }).fill(value);
    }
    await page.getByRole("radio", { name: "Femme" }).check();
    await page.getByLabel("Comment préfères-tu qu'on te contacte ?").selectOption("EMAIL");
    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Un compte existe déjà avec cet email.")).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
  });
});
