/**
 * US4 — manage my cart (spec acceptance scenarios, SC-007, US4-7).
 *
 * Runs against the real local backend and Keycloak. Each account journey registers a fresh user
 * through the backend (`POST /user/register`, rate limited to 5 per minute and per IP), so the
 * account journeys only run in the `chromium` project.
 *
 * The seeded catalog has 10 000 units of every product: the « not enough stock » and
 * « out of stock » cases rewrite the BFF answers in the browser.
 */
import { expect, test, type BrowserContext, type Page, type Route } from "@playwright/test";

/** Backend started from IntelliJ (constitution X), used only to register test users. */
const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://localhost:8081";

const PASSWORD = "Passw0rd!";
const GUEST_CART_KEY = "ct_guest_cart_v1";

async function registerUser(context: BrowserContext): Promise<string> {
  const email = `e2e.cart.${Date.now()}.${Math.floor(Math.random() * 1_000)}@example.com`;
  const response = await context.request.post(`${BACKEND_URL}/api/v1/services/user/register`, {
    headers: { "X-API-VERSION": "1.0" },
    data: {
      email,
      firstName: "Camille",
      // The backend builds the Keycloak username from the names: they must be unique too.
      lastName: `Testeur${Date.now()}`,
      sex: "F",
      phoneNumber: "+33600000000",
      favoriteCommunicationChanel: "EMAIL",
      street: "1 rue du Test",
      city: "Paris",
      zipCode: "75001",
      country: "France",
      password: PASSWORD,
    },
  });
  expect(response.status()).toBe(201);
  return email;
}

/** Signs in through Auth.js and the Keycloak login form (the login page comes with US3). */
async function signIn(page: Page, email: string, callbackPath = "/"): Promise<void> {
  await page.evaluate(async (callbackUrl) => {
    const { csrfToken } = (await (await fetch("/api/auth/csrf")).json()) as { csrfToken: string };
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signin/keycloak";
    for (const [name, value] of Object.entries({ csrfToken, callbackUrl })) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.append(input);
    }
    document.body.append(form);
    form.submit();
  }, callbackPath);
  await page.waitForURL(/\/realms\/cybertech\//);
  await page.locator("#username").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#kc-login").click();
  await page.waitForURL((url) => url.pathname === callbackPath && url.port === "3000");
}

/**
 * Paths of the first products (best sellers, then catalog) that really exist and are in stock. The search
 * index may still list products that were deleted from the database (reseeded backend), so the
 * live stock decides.
 */
async function firstProductPaths(page: Page, count: number): Promise<string[]> {
  const hrefs: (string | null)[] = [];
  for (const [path, list] of [
    ["/", "Les plus demandés"],
    ["/products", "Produits"],
  ] as const) {
    await page.goto(path);
    const links = page.getByRole("list", { name: list }).getByRole("heading").getByRole("link");
    hrefs.push(
      ...(await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")))),
    );
  }
  const uuids = [...new Set(hrefs.map((href) => href?.split("/").pop() ?? "").filter(Boolean))];
  const response = await page.request.get(`/api/availability?uuids=${uuids.join(",")}`);
  const { items } = (await response.json()) as {
    items: { productUuid: string; inStock: boolean }[];
  };
  const inStock = new Set(items.filter((item) => item.inStock).map((item) => item.productUuid));
  const paths = uuids.filter((uuid) => inStock.has(uuid)).map((uuid) => `/products/${uuid}`);
  expect(paths.length).toBeGreaterThanOrEqual(count);
  return paths.slice(0, count);
}

async function addFromProductPage(page: Page, path: string, quantity: number): Promise<void> {
  await page.goto(path);
  await page.getByRole("spinbutton", { name: "Quantité" }).fill(String(quantity));
  await page.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.getByRole("status").filter({ hasText: "ajouté à ton panier" })).toBeVisible();
}

const badge = (page: Page) => page.getByRole("link", { name: /^Panier/ });

async function guestStorage(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), GUEST_CART_KEY);
}

test.describe("guest cart", () => {
  test("adding 1 then 2 units gives one line of 3", async ({ page }) => {
    const [path = ""] = await firstProductPaths(page, 1);
    await addFromProductPage(page, path, 1);
    await addFromProductPage(page, path, 2);
    await expect(badge(page)).toHaveAccessibleName("Panier, 3 articles");

    await page.goto("/cart");
    const lines = page.getByRole("list", { name: "Articles du panier" }).getByRole("listitem");
    await expect(lines).toHaveCount(1);
    await expect(lines.first().getByRole("spinbutton")).toHaveValue("3");
    await expect(page.getByText("Total estimé")).toBeVisible();
  });

  test("asking for more than the stock explains it and leaves the cart unchanged", async ({
    page,
  }) => {
    await page.route("**/api/cart/preview", async (route: Route) => {
      const response = await route.fetch();
      const view = (await response.json()) as { lines: { quantity: number }[] };
      const lines = view.lines.map((line) => ({
        ...line,
        availableStock: 2,
        status: line.quantity > 2 ? "insufficient-stock" : "ok",
      }));
      await route.fulfill({ response, json: { ...view, lines } });
    });
    const [path = ""] = await firstProductPaths(page, 1);
    await page.goto(path);
    await page.getByRole("spinbutton", { name: "Quantité" }).fill("3");
    await page.getByRole("button", { name: "Ajouter au panier" }).click();

    await expect(page.getByText("Il n'en reste que 2.")).toBeVisible();
    expect(await guestStorage(page)).toBeNull();
    await expect(badge(page)).toHaveAccessibleName("Panier vide");
  });

  test("a line can be removed and the cart cleared after confirmation", async ({ page }) => {
    const [first = "", second = ""] = await firstProductPaths(page, 2);
    await addFromProductPage(page, first, 1);
    await addFromProductPage(page, second, 1);
    await page.goto("/cart");
    const lines = page.getByRole("list", { name: "Articles du panier" }).getByRole("listitem");
    await expect(lines).toHaveCount(2);

    await lines
      .first()
      .getByRole("button", { name: /du panier$/ })
      .click();
    await expect(lines).toHaveCount(1);
    await expect(
      page.getByRole("status").filter({ hasText: "retiré de ton panier" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Vider le panier" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Oui, vider" }).click();
    await expect(page.getByRole("heading", { name: "Ton panier est vide" })).toBeVisible();
    expect(await guestStorage(page)).toBeNull();
  });

  test("an out-of-stock product cannot be added, on the card nor on its page", async ({ page }) => {
    await page.route("**/api/availability**", async (route) => {
      const uuids = (new URL(route.request().url()).searchParams.get("uuids") ?? "").split(",");
      await route.fulfill({
        json: {
          items: uuids.map((productUuid) => ({ productUuid, availableStock: 0, inStock: false })),
        },
      });
    });
    const [path = ""] = await firstProductPaths(page, 1);
    const card = page.getByRole("list", { name: "Produits" }).getByRole("listitem").first();
    await expect(card.getByRole("button", { name: "Indisponible" })).toBeDisabled();

    await page.goto(path);
    await expect(page.getByRole("button", { name: "Indisponible" })).toBeDisabled();
  });
});

test.describe("account cart", () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== "chromium",
      "Account journeys register users: run them once, in the chromium project",
    );
  });

  test("signing in merges the guest cart once, with a summary", async ({ page, context }) => {
    const email = await registerUser(context);
    const [path = ""] = await firstProductPaths(page, 1);
    await addFromProductPage(page, path, 2);

    await signIn(page, email, "/cart");
    await expect(page.getByText("1 article ajouté à ton panier.")).toBeVisible();
    await expect(page.getByText("Total", { exact: true })).toBeVisible();
    const lines = page.getByRole("list", { name: "Articles du panier" }).getByRole("listitem");
    await expect(lines.first().getByRole("spinbutton")).toHaveValue("2");
    expect(await guestStorage(page)).toBeNull();
  });

  test("two open tabs merge only once (SC-007)", async ({ context }) => {
    const email = await registerUser(context);
    const first = await context.newPage();
    const second = await context.newPage();
    const [path = ""] = await firstProductPaths(first, 1);
    await addFromProductPage(first, path, 2);
    await second.goto("/");

    let merges = 0;
    await context.route("**/api/cart/merge", async (route) => {
      merges += 1;
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      await route.continue();
    });
    await signIn(first, email, "/");
    // The second tab loads while the first one holds the merge lock (merge delayed above).
    await second.reload();
    await expect(first.getByText("1 article ajouté à ton panier.")).toBeVisible();
    await second.waitForLoadState("networkidle");
    await first.goto("/cart");
    const lines = first.getByRole("list", { name: "Articles du panier" }).getByRole("listitem");
    await expect(lines.first().getByRole("spinbutton")).toHaveValue("2");
    await second.goto("/cart");
    await expect(
      second.getByRole("list", { name: "Articles du panier" }).getByRole("spinbutton").first(),
    ).toHaveValue("2");
    expect(merges).toBe(1);
  });

  test("the same account sees the same cart in another browser", async ({
    browser,
    page,
    context,
  }) => {
    const email = await registerUser(context);
    await page.goto("/");
    await signIn(page, email, "/");
    const [path = ""] = await firstProductPaths(page, 1);
    await addFromProductPage(page, path, 3);
    await expect(badge(page)).toHaveAccessibleName("Panier, 3 articles");

    const other = await browser.newContext({ locale: "fr-FR" });
    const otherPage = await other.newPage();
    await otherPage.goto("/");
    await signIn(otherPage, email, "/cart");
    const lines = otherPage.getByRole("list", { name: "Articles du panier" }).getByRole("listitem");
    await expect(lines).toHaveCount(1);
    await expect(lines.first().getByRole("spinbutton")).toHaveValue("3");
    await other.close();
  });
});
