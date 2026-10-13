import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CommandPalette } from "@/features/catalog/components/CommandPalette";

import { renderWithQuery } from "../../helpers/render";
import { server } from "../../msw/server";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const PRODUCT = {
  uuid: "11111111-1111-4111-8111-111111111111",
  name: "Lenovo ThinkPad X1",
  brand: "LENOVO",
  category: "COMPUTER",
  price: 1499.9,
  imageUrl: null,
};

/** Mocks `/api/search` and records every keyword sent. */
function mockSearch(): string[] {
  const keywords: string[] = [];
  server.use(
    http.get("*/api/search", ({ request }) => {
      keywords.push(new URL(request.url).searchParams.get("q") ?? "");
      return HttpResponse.json({ results: [PRODUCT] });
    }),
  );
  return keywords;
}

beforeAll(() => {
  // cmdk measures and scrolls its list; jsdom implements neither.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    value: vi.fn(),
    configurable: true,
  });
});

beforeEach(() => {
  push.mockReset();
});

describe("CommandPalette", () => {
  it("opens with Ctrl+K and closes with Escape", async () => {
    const user = userEvent.setup();
    renderWithQuery(<CommandPalette />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.keyboard("{Control>}k{/Control}");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Rechercher un produit…")).toHaveFocus();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("opens with ⌘K and with the header button", async () => {
    const user = userEvent.setup();
    renderWithQuery(<CommandPalette />);
    await user.keyboard("{Meta>}k{/Meta}");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: /Rechercher/ }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("searches once the typing stops (debounce)", async () => {
    const keywords = mockSearch();
    const user = userEvent.setup();
    renderWithQuery(<CommandPalette />);
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByRole("combobox"), "lenovo");

    expect(await screen.findByText("Lenovo ThinkPad X1")).toBeInTheDocument();
    expect(keywords).toEqual(["lenovo"]);
  });

  it("opens the product page from the keyboard", async () => {
    mockSearch();
    const user = userEvent.setup();
    renderWithQuery(<CommandPalette />);
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByRole("combobox"), "lenovo");
    await screen.findByText("Lenovo ThinkPad X1");

    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith(`/products/${PRODUCT.uuid}`);
  });

  it("offers every result of the keyword in the catalog", async () => {
    mockSearch();
    const user = userEvent.setup();
    renderWithQuery(<CommandPalette />);
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByRole("combobox"), "lenovo");
    await user.click(await screen.findByText("Voir tous les résultats pour « lenovo »"));
    expect(push).toHaveBeenCalledWith("/products?q=lenovo");
  });

  it("says so when nothing matches", async () => {
    server.use(http.get("*/api/search", () => HttpResponse.json({ results: [] })));
    const user = userEvent.setup();
    renderWithQuery(<CommandPalette />);
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByRole("combobox"), "zzz");
    expect(
      await screen.findByText("Aucun produit ne correspond. Essaie un autre mot."),
    ).toBeInTheDocument();
  });
});
