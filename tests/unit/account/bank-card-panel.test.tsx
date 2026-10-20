/**
 * « Ma carte » components with jest-axe (feature 003 US5, T064 and T086): masked card, edit
 * form with expiry selects, delete dialog, « aucune carte » state, and « Ajouter une carte »
 * (network deduced from the number, test-card notice, replacement confirmation, number emptied
 * after sending, nothing in the browser storage, the previous card's loss said explicitly).
 *
 * @see specs/003-account-orders/spec.md US5, FR-031, FR-032, SC-008
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CardDeleteState, CardUpdateState } from "@/features/account/card-state";
import type { CardView } from "@/features/account/card-view";
import { BankCardPanel } from "@/features/account/components/BankCardPanel";
import { BankCardType, CardFormStatus } from "@/lib/enums/bank-card";

import { server } from "../../msw/server";

const navigation = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh, push: navigation.push, replace: vi.fn() }),
  usePathname: () => "/account/card",
}));

const actions = vi.hoisted(() => ({
  updateBankCard: vi.fn<(previous: CardUpdateState, data: FormData) => Promise<CardUpdateState>>(),
  deleteBankCard: vi.fn<() => Promise<CardDeleteState>>(),
}));
vi.mock("@/features/account/actions", () => actions);

const NUMBER = "1111111111111111";
const MONTHS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const YEARS = ["2026", "2027", "2028", "2030"];

const CARD: CardView = {
  network: BankCardType.VISA,
  lastDigits: "4242",
  holder: "Camille Testeur",
  expiryMonth: "12",
  expiryYear: "2030",
};

/** Requests sent to the BFF by the add form. */
let sent: unknown[] = [];

/**
 * Mocks `POST /api/bank-card`.
 *
 * @param status - Status answered.
 * @param error - Error object answered on failure.
 */
function mockAdd(status: number, error: Record<string, unknown> = {}): void {
  server.use(
    http.post("*/api/bank-card", async ({ request }) => {
      sent.push(await request.json());
      return status === 201
        ? HttpResponse.json(
            { maskedNumber: "**** **** **** 1111", expiryDate: "12/2030", cardType: "OTHER" },
            { status },
          )
        : HttpResponse.json({ error: { message: "refused", ...error } }, { status });
    }),
  );
}

/**
 * Fills the add form with a valid test card.
 *
 * @param user - User event instance.
 * @param number - Number typed.
 */
async function fillCard(user: ReturnType<typeof userEvent.setup>, number = NUMBER): Promise<void> {
  const holder = screen.getByLabelText("Titulaire de la carte", { selector: "#card-add-holder" });
  await user.clear(holder);
  await user.type(holder, "Camille Testeur");
  await user.type(screen.getByLabelText("Numéro de carte"), number);
  const form = screen.getByRole("form", { name: "Ajouter une carte" });
  await user.selectOptions(within(form).getByLabelText("Mois d'expiration"), "12");
  await user.selectOptions(within(form).getByLabelText("Année d'expiration"), "2030");
}

beforeEach(() => {
  sent = [];
  navigation.refresh.mockClear();
  navigation.push.mockClear();
  actions.updateBankCard.mockReset();
  actions.deleteBankCard.mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  // Nothing about the card ever goes to the browser storage.
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const stored = Array.from({ length: storage.length }, (_, index) => {
      const key = storage.key(index) ?? "";
      return `${key}=${storage.getItem(key) ?? ""}`;
    });
    expect(stored.join(";")).not.toContain("1111");
  }
});

describe("saved card", () => {
  it("shows the masked card, never a full number, and has no number field", async () => {
    const { container } = render(
      <BankCardPanel card={CARD} returnTo={null} months={MONTHS} years={YEARS} />,
    );
    expect(screen.getByText(/Carte Visa se terminant par 4242/)).toBeInTheDocument();
    expect(screen.getByTestId("card-visual")).toHaveTextContent("•••• •••• •••• 4242");
    expect(screen.getByTestId("card-visual").textContent).not.toMatch(/\d{5,}/);
    expect(screen.getByText(/se terminant par 4242/).textContent).not.toMatch(/\d{5,}/);
    expect(screen.queryByLabelText("Numéro de carte")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("edits the holder and the expiry through month and year selects", () => {
    render(<BankCardPanel card={CARD} returnTo={null} months={MONTHS} years={YEARS} />);
    expect(screen.getByLabelText("Titulaire de la carte")).toHaveValue("Camille Testeur");
    expect(screen.getByLabelText("Mois d'expiration")).toHaveValue("12");
    expect(screen.getByLabelText("Année d'expiration")).toHaveValue("2030");
  });

  it("shows the expiry error and the sign-in link after a refused update", async () => {
    const user = userEvent.setup();
    actions.updateBankCard.mockResolvedValue({
      status: CardFormStatus.ERROR,
      fieldErrors: { expiryMonth: "Cette date est passée : choisis une expiration à venir." },
      formError: "Ta session a expiré : reconnecte-toi, ta saisie est conservée ici.",
      needsSignIn: true,
      values: { holder: "Camille", expiryMonth: "12", expiryYear: "2030" },
    });
    render(<BankCardPanel card={CARD} returnTo={null} months={MONTHS} years={YEARS} />);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText(/date est passée/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Me reconnecter" })).toBeInTheDocument();
    expect(screen.getByLabelText("Titulaire de la carte")).toHaveValue("Camille");
  });

  it("asks for confirmation before deleting and gives the focus back on cancel", async () => {
    const user = userEvent.setup();
    actions.deleteBankCard.mockResolvedValue({ status: CardFormStatus.SUCCESS });
    render(<BankCardPanel card={CARD} returnTo={null} months={MONTHS} years={YEARS} />);
    const trigger = screen.getByRole("button", { name: "Supprimer la carte" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Supprimer ta carte ?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Garder ma carte" }));
    await waitFor(() => {
      expect(trigger).toHaveFocus();
    });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Oui, supprimer" }));
    await waitFor(() => {
      expect(actions.deleteBankCard).toHaveBeenCalled();
    });
  });
});

describe("no card", () => {
  it("explains that a card is needed and offers « Ajouter une carte » with the test-card notice", async () => {
    const { container } = render(
      <BankCardPanel card={null} returnTo={null} months={MONTHS} years={YEARS} />,
    );
    expect(screen.getByRole("heading", { name: "Aucune carte enregistrée" })).toBeInTheDocument();
    expect(screen.getByText(/nécessaire pour commander/)).toBeInTheDocument();
    expect(screen.getByText(/1111 1111 1111 1111 paie/)).toBeInTheDocument();
    const number = screen.getByLabelText("Numéro de carte");
    expect(number).toHaveAttribute("inputmode", "numeric");
    expect(number).toHaveAttribute("autocomplete", "off");
    expect(number).not.toHaveAttribute("name");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("deduces the network from the number, and lets the customer change it", async () => {
    const user = userEvent.setup();
    render(<BankCardPanel card={null} returnTo={null} months={MONTHS} years={YEARS} />);
    const number = screen.getByLabelText("Numéro de carte");
    const network = screen.getByLabelText("Réseau");
    await user.type(number, "4242");
    expect(number).toHaveValue("4242");
    expect(network).toHaveValue(BankCardType.VISA);
    await user.clear(number);
    await user.type(number, "11111111");
    expect(number).toHaveValue("1111 1111");
    expect(network).toHaveValue(BankCardType.OTHER);
    await user.selectOptions(network, BankCardType.MASTERCARD);
    await user.type(number, "4");
    expect(network).toHaveValue(BankCardType.MASTERCARD);
  });

  it("refuses a short number on the field without sending anything", async () => {
    const user = userEvent.setup();
    mockAdd(201);
    render(<BankCardPanel card={null} returnTo={null} months={MONTHS} years={YEARS} />);
    await fillCard(user, "111111111111");
    await user.click(screen.getByRole("button", { name: "Enregistrer la carte" }));
    expect(
      await screen.findByText("Le numéro doit compter de 13 à 19 chiffres."),
    ).toBeInTheDocument();
    expect(sent).toHaveLength(0);
  });

  it("sends the card, empties the number and goes back to the checkout", async () => {
    const user = userEvent.setup();
    mockAdd(201);
    render(<BankCardPanel card={null} returnTo="/checkout" months={MONTHS} years={YEARS} />);
    await fillCard(user);
    await user.click(screen.getByRole("button", { name: "Enregistrer la carte" }));
    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalledWith("/checkout");
    });
    expect(sent[0]).toEqual({
      cardHolderName: "Camille Testeur",
      cardNumber: NUMBER,
      expiryDate: "12/2030",
      cardType: BankCardType.OTHER,
      replace: false,
    });
    expect(screen.getByLabelText("Numéro de carte")).toHaveValue("");
    // The only « 1111 » left on the page is the test-card notice.
    expect(screen.getAllByText(/1111 1111 1111 1111/)).toHaveLength(1);
  });
});

describe("replacement", () => {
  it("confirms first, then says plainly that the old card is kept when the replacement failed", async () => {
    const user = userEvent.setup();
    mockAdd(503, { code: "unavailable", cardKept: true });
    render(<BankCardPanel card={CARD} returnTo={null} months={MONTHS} years={YEARS} />);
    await user.click(screen.getByRole("button", { name: "Remplacer ma carte" }));
    await fillCard(user);
    await user.click(screen.getByRole("button", { name: "Enregistrer la carte" }));
    expect(screen.getByRole("dialog", { name: "Remplacer ta carte ?" })).toBeInTheDocument();
    expect(sent).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Oui, remplacer" }));
    expect(await screen.findByText(/ancienne carte est toujours enregistrée/)).toBeInTheDocument();
    expect(sent[0]).toMatchObject({ replace: true });
    expect(screen.getByLabelText("Numéro de carte")).toHaveValue("");
    expect(navigation.refresh).toHaveBeenCalled();
  });

  it("keeps the previous card on a refusal before any deletion", async () => {
    const user = userEvent.setup();
    mockAdd(409, { code: "conflict" });
    render(<BankCardPanel card={CARD} returnTo={null} months={MONTHS} years={YEARS} />);
    await user.click(screen.getByRole("button", { name: "Remplacer ma carte" }));
    await fillCard(user);
    await user.click(screen.getByRole("button", { name: "Enregistrer la carte" }));
    await user.click(screen.getByRole("button", { name: "Oui, remplacer" }));
    expect(await screen.findByText(/remplace-la plutôt/)).toBeInTheDocument();
    expect(screen.getByTestId("card-visual")).toHaveTextContent("4242");
  });
});
