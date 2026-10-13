import { describe, expect, it } from "vitest";

import { QueryKey } from "@/lib/enums/query-key";
import { formatPrice } from "@/lib/format";
import { createQueryClient, resetClientState } from "@/lib/query/query-client";

describe("createQueryClient", () => {
  it("applies the documented defaults", () => {
    const client = createQueryClient();
    const defaults = client.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(30_000);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(true);
    expect(defaults.mutations?.retry).toBe(false);
  });
});

describe("resetClientState (FR-017)", () => {
  it("removes every cached query", () => {
    const client = createQueryClient();
    client.setQueryData([QueryKey.CART], { items: ["private"] });
    client.setQueryData([QueryKey.AVAILABILITY, "x"], { stock: 3 });
    client.setQueryData([QueryKey.RECENT_PRODUCTS], ["p1"]);

    resetClientState(client);

    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(client.getQueryData([QueryKey.CART])).toBeUndefined();
  });
});

describe("formatPrice", () => {
  it("formats euros the French way", () => {
    expect(formatPrice(1499.9).replace(/\s/g, " ")).toBe("1 499,90 €");
  });
});
