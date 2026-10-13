import { z } from "zod";
import { describe, expect, it } from "vitest";

import { pagedSchema } from "@/lib/schemas/paged";

const PagedNumbers = pagedSchema(z.number());

describe("pagedSchema", () => {
  it("parses a Spring PagedModel", () => {
    const page = PagedNumbers.parse({
      content: [1, 2],
      page: { size: 24, number: 0, totalElements: 2, totalPages: 1 },
    });
    expect(page.content).toEqual([1, 2]);
    expect(page.page.number).toBe(0);
  });

  it("rejects a missing page block and invalid items", () => {
    expect(PagedNumbers.safeParse({ content: [1] }).success).toBe(false);
    expect(
      PagedNumbers.safeParse({
        content: ["x"],
        page: { size: 24, number: 0, totalElements: 1, totalPages: 1 },
      }).success,
    ).toBe(false);
  });
});
