import { screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { AvailabilityBadge } from "@/features/catalog/components/AvailabilityBadge";

import { renderWithQuery } from "../../helpers/render";
import { server } from "../../msw/server";

const IN_STOCK = "11111111-1111-4111-8111-111111111111";
const LOW_STOCK = "22222222-2222-4222-8222-222222222222";
const OUT_OF_STOCK = "33333333-3333-4333-8333-333333333333";
const UNKNOWN = "44444444-4444-4444-8444-444444444444";

const STOCK: Record<string, { availableStock: number; inStock: boolean }> = {
  [IN_STOCK]: { availableStock: 42, inStock: true },
  [LOW_STOCK]: { availableStock: 3, inStock: true },
  [OUT_OF_STOCK]: { availableStock: 0, inStock: false },
};

/** Mocks the BFF and records every requested UUID list. */
function mockAvailability(): string[] {
  const calls: string[] = [];
  server.use(
    http.get("*/api/availability", ({ request }) => {
      const uuids = new URL(request.url).searchParams.get("uuids") ?? "";
      calls.push(uuids);
      const items = uuids
        .split(",")
        .filter((uuid) => uuid in STOCK)
        .map((uuid) => ({ productUuid: uuid, ...STOCK[uuid] }));
      return HttpResponse.json({ items });
    }),
  );
  return calls;
}

describe("AvailabilityBadge", () => {
  it("shows « En stock » for a well-stocked product", async () => {
    mockAvailability();
    renderWithQuery(<AvailabilityBadge productUuid={IN_STOCK} />);
    expect(await screen.findByText("En stock")).toBeInTheDocument();
  });

  it("shows « Plus que N » at or below the low-stock threshold", async () => {
    mockAvailability();
    renderWithQuery(<AvailabilityBadge productUuid={LOW_STOCK} />);
    expect(await screen.findByText("Plus que 3")).toBeInTheDocument();
  });

  it("shows « Rupture » without stock or for an unknown product", async () => {
    mockAvailability();
    renderWithQuery(
      <>
        <AvailabilityBadge productUuid={OUT_OF_STOCK} />
        <AvailabilityBadge productUuid={UNKNOWN} />
      </>,
    );
    await waitFor(() => {
      expect(screen.getAllByText("Rupture")).toHaveLength(2);
    });
  });

  it("asks the BFF once for every badge of the same render", async () => {
    const calls = mockAvailability();
    renderWithQuery(
      <>
        <AvailabilityBadge productUuid={IN_STOCK} />
        <AvailabilityBadge productUuid={LOW_STOCK} />
        <AvailabilityBadge productUuid={OUT_OF_STOCK} />
      </>,
    );
    await screen.findByText("Plus que 3");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.split(",").sort()).toEqual([IN_STOCK, LOW_STOCK, OUT_OF_STOCK].sort());
  });

  it("renders the server-read stock immediately", () => {
    mockAvailability();
    renderWithQuery(
      <AvailabilityBadge
        productUuid={OUT_OF_STOCK}
        initialAvailability={{ productUuid: OUT_OF_STOCK, availableStock: 0, inStock: false }}
      />,
    );
    expect(screen.getByText("Rupture")).toBeInTheDocument();
  });

  it("says the stock could not be checked when the BFF fails", async () => {
    server.use(
      http.get("*/api/availability", () =>
        HttpResponse.json({ error: { code: "unavailable", message: "down" } }, { status: 503 }),
      ),
    );
    renderWithQuery(<AvailabilityBadge productUuid={IN_STOCK} />);
    expect(await screen.findByText("Stock non vérifié")).toBeInTheDocument();
  });

  it("is a polite live region without accessibility violations", async () => {
    mockAvailability();
    const { container } = renderWithQuery(<AvailabilityBadge productUuid={LOW_STOCK} />);
    await screen.findByText("Plus que 3");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(await axe(container)).toHaveNoViolations();
  });
});
