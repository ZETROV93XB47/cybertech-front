// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { getShippingOptions } from "@/lib/api/endpoints/shipping";
import { ShippingProvider, ShippingType } from "@/lib/enums/shipping";

import { TEST_BACKEND_URL } from "../../helpers/test-env";
import { testLogger } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const OPTIONS_URL = `${TEST_BACKEND_URL}/api/v1/services/shipping/options`;

describe("getShippingOptions", () => {
  it("returns the validated options", async () => {
    server.use(
      http.get(OPTIONS_URL, () =>
        HttpResponse.json([{ provider: "DHL", type: "EXPRESS", cost: 25, currency: "EUR" }]),
      ),
    );
    expect(await getShippingOptions()).toEqual([
      {
        provider: ShippingProvider.DHL,
        type: ShippingType.EXPRESS,
        cost: 25,
        currency: "EUR",
      },
    ]);
  });

  it.each([
    ["the backend is down", () => HttpResponse.error()],
    [
      "the answer breaks the contract",
      () => HttpResponse.json([{ provider: "UPS", type: "EXPRESS", cost: 25, currency: "EUR" }]),
    ],
  ])("returns null and warns when %s", async (_label, resolver) => {
    server.use(http.get(OPTIONS_URL, resolver));
    expect(await getShippingOptions()).toBeNull();
    expect(testLogger.warn).toHaveBeenCalled();
  });
});
