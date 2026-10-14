/**
 * Shared helpers of the Playwright journeys: test users, sign-in through the real Keycloak and
 * choice of products that really exist.
 */
import { expect, type BrowserContext, type Page } from "@playwright/test";

/** Backend started from IntelliJ (constitution X), used only to register test users. */
const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://localhost:8081";

const PASSWORD = "Passw0rd!";

/**
 * Saved card of the test users who place orders: the backend refuses `POST /order/place`
 * without one (`BANK_CARD_NOT_FOUND`), and the front never adds a card (constitution V). Since
 * backend `ae1d263` the number decides the payment: only 1s pay, any other number is declined
 * (backend `docs/test-cards.md`). Sent to the backend only, by the test itself.
 */
const TEST_BANK_CARD = {
  cardHolderName: "Camille Testeur",
  cardNumber: "1111111111111111",
  expiryDate: "12/2030",
  cardType: "VISA",
} as const;

/** Options of {@link registerUser}. */
export interface RegisterOptions {
  /** Registers the user with a saved card (needed to place an order). */
  readonly withBankCard?: boolean;
}

export async function registerUser(
  context: BrowserContext,
  { withBankCard = false }: RegisterOptions = {},
): Promise<string> {
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
      ...(withBankCard ? { bankCardCreationRequestDto: TEST_BANK_CARD } : {}),
    },
  });
  expect(response.status()).toBe(201);
  return email;
}

/** Signs in through the sign-in page and the real Keycloak form, then waits for the return. */
export async function signIn(page: Page, email: string, callbackPath = "/"): Promise<void> {
  await page.goto(loginUrl(callbackPath));
  await fillKeycloakForm(page, email);
  await page.waitForURL((url) => url.pathname === callbackPath && url.port === "3000");
}

/**
 * Paths of the first products (best sellers, then catalog) that really exist and are in stock. The search
 * index may still list products that were deleted from the database (reseeded backend), so the
 * live stock decides.
 */
export async function firstProductPaths(page: Page, count: number): Promise<string[]> {
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

/** Path of the sign-in page with a page to come back to. */
export function loginUrl(callbackPath: string): string {
  return `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;
}

/** Fills the Keycloak login form (hosted by Keycloak, outside the front). */
export async function fillKeycloakForm(page: Page, email: string): Promise<void> {
  await page.waitForURL(/\/realms\/cybertech\//);
  await page.locator("#username").fill(email);
  await page.locator("#password").fill(PASSWORD);
  await page.locator("#kc-login").click();
}
