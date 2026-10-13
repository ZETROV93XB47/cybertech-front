import { afterEach, describe, expect, it, vi } from "vitest";

import { createAvailabilityLoader } from "@/features/catalog/availability-batcher";
import { visiblePages } from "@/features/catalog/components/Pagination";
import { greetingFor } from "@/features/catalog/greeting";
import { buildProductSpecs, formatSpecValue } from "@/features/catalog/product-specs";
import { readRecentlyViewed, recordRecentlyViewed } from "@/features/catalog/recently-viewed";
import { parseSearchParams, restrictToFacets } from "@/features/catalog/search-params";
import { DiscountCalculationType } from "@/lib/enums/discount-calculation-type";
import { FacetKind } from "@/lib/enums/facet-kind";
import { formatDay } from "@/lib/format";
import { isDisplayableDiscount, type ActiveDiscount } from "@/lib/schemas/discount";

import { fakeUuids } from "../../helpers/products";

describe("restrictToFacets", () => {
  it("keeps only the attributes the category schema defines", () => {
    const filters = parseSearchParams(
      new URLSearchParams(
        "category=COMPUTER&a.panel=IPS&a.panel=PLASMA&a.touch=true&a.unknown=x&r.ram=8-&r.panel=1-2",
      ),
    );
    const restricted = restrictToFacets(filters, [
      { kind: FacetKind.ENUM, key: "panel", label: "Dalle", options: ["IPS", "VA"] },
      { kind: FacetKind.BOOLEAN, key: "touch", label: "Tactile" },
      { kind: FacetKind.RANGE, key: "ram", label: "RAM" },
    ]);
    expect(restricted.attributes).toEqual({ panel: ["IPS"], touch: ["true"] });
    expect(restricted.numericRanges).toEqual({ ram: { min: 8 } });
  });
});

describe("visiblePages", () => {
  it("shows the ends and the siblings of the current page, with gaps", () => {
    expect(visiblePages(0, 3)).toEqual([0, 1, 2]);
    expect(visiblePages(10, 23)).toEqual([0, null, 8, 9, 10, 11, 12, null, 22]);
    expect(visiblePages(1, 23)).toEqual([0, 1, 2, 3, null, 22]);
  });
});

describe("greetingFor", () => {
  it("says Bonjour during the day and Bonsoir in the evening and at night", () => {
    expect(greetingFor(new Date(2026, 0, 1, 5, 0))).toBe("Bonjour");
    expect(greetingFor(new Date(2026, 0, 1, 17, 59))).toBe("Bonjour");
    expect(greetingFor(new Date(2026, 0, 1, 18, 0))).toBe("Bonsoir");
    expect(greetingFor(new Date(2026, 0, 1, 4, 59))).toBe("Bonsoir");
  });
});

describe("buildProductSpecs", () => {
  it("labels attributes in French, adds units and keeps schema order", () => {
    const specs = buildProductSpecs(
      { memory: 512, cpu: "Intel Core 7", touch: true, extraKey: "x", empty: "", nested: { a: 1 } },
      { cpu: "Cpu", ram: "Ram", memory: "Memory" },
    );
    expect(specs).toEqual([
      { key: "cpu", label: "Processeur", value: "Intel Core 7" },
      { key: "memory", label: "Stockage", value: "512 Go" },
      { key: "touch", label: "Touch", value: "Oui" },
      { key: "extraKey", label: "Extra key", value: "x" },
    ]);
  });
});

describe("formatSpecValue", () => {
  it("formats numbers in French with the unit of known attributes", () => {
    expect(formatSpecValue("ram", 16)).toBe("16 Go");
    expect(formatSpecValue("refreshRate", 144)).toBe("144 Hz");
    expect(formatSpecValue("memory", 1024)).toBe("1 024 Go");
    expect(formatSpecValue("weight", 1.5)).toBe("1,5");
  });

  it("writes booleans as Oui / Non", () => {
    expect(formatSpecValue("touch", true)).toBe("Oui");
    expect(formatSpecValue("touch", false)).toBe("Non");
  });

  it("trims strings and refuses empty strings, objects and missing values", () => {
    expect(formatSpecValue("cpu", "  AMD Ryzen 7 ")).toBe("AMD Ryzen 7");
    expect(formatSpecValue("cpu", "   ")).toBeNull();
    expect(formatSpecValue("cpu", { a: 1 })).toBeNull();
    expect(formatSpecValue("cpu", undefined)).toBeNull();
  });
});

describe("recently viewed storage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("puts the latest view first, without duplicate, keeping 8 entries", () => {
    const uuids = fakeUuids(9);
    uuids.forEach((uuid) => recordRecentlyViewed(localStorage, uuid));
    recordRecentlyViewed(localStorage, uuids[4]!);
    const stored = readRecentlyViewed(localStorage);
    expect(stored).toHaveLength(8);
    expect(stored[0]).toBe(uuids[4]);
    expect(new Set(stored).size).toBe(8);
  });

  it("removes invalid content and starts again from empty", () => {
    localStorage.setItem("ct_recent_v1", JSON.stringify({ uuids: ["not-a-uuid"] }));
    expect(readRecentlyViewed(localStorage)).toEqual([]);
    expect(localStorage.getItem("ct_recent_v1")).toBeNull();
    localStorage.setItem("ct_recent_v1", "{broken");
    expect(readRecentlyViewed(localStorage)).toEqual([]);
  });
});

describe("createAvailabilityLoader", () => {
  it("groups the requests of one task and splits them into calls of 50", async () => {
    const fetcher = vi.fn((uuids: readonly string[]) =>
      Promise.resolve(
        uuids.map((productUuid) => ({ productUuid, availableStock: 1, inStock: true })),
      ),
    );
    const load = createAvailabilityLoader(fetcher);
    const uuids = fakeUuids(60);
    const results = await Promise.all([...uuids, uuids[0]!].map((uuid) => load(uuid)));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(results.every((result) => result !== null)).toBe(true);
  });

  it("resolves null for an unknown product and rejects every caller on failure", async () => {
    const [known, unknown] = fakeUuids(2);
    const load = createAvailabilityLoader(() =>
      Promise.resolve([{ productUuid: known!, availableStock: 2, inStock: true }]),
    );
    expect(await load(unknown!)).toBeNull();
    const failing = createAvailabilityLoader(() => Promise.reject(new Error("down")));
    await expect(Promise.all([failing(known!), failing(unknown!)])).rejects.toThrow("down");
  });
});

describe("discounts", () => {
  const base: ActiveDiscount = {
    discountKey: "BLACK_FRIDAY",
    calculationType: DiscountCalculationType.PERCENTAGE,
    percentage: 20,
    fixedAmount: null,
    minOrderAmount: null,
    maxDiscountAmount: null,
    startsAt: null,
    endsAt: "2026-11-30T23:59:59",
  };

  it("hides the NONE campaign and campaigns without amount", () => {
    expect(isDisplayableDiscount(base)).toBe(true);
    expect(isDisplayableDiscount({ ...base, calculationType: DiscountCalculationType.NONE })).toBe(
      false,
    );
    expect(isDisplayableDiscount({ ...base, percentage: null })).toBe(false);
  });

  it("reads backend dates without time zone as UTC", () => {
    expect(formatDay("2026-11-30T23:59:59")).toBe("30 novembre");
    expect(formatDay("not a date")).toBeNull();
  });
});
