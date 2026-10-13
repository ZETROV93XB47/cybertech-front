// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { getMe } from "@/lib/api/endpoints/users";
import { ApiError } from "@/lib/api/errors";

import { API, errorBody } from "../../helpers/cart";
import { allLoggedText } from "../../helpers/test-logger";
import { server } from "../../msw/server";

const TOKEN = "secret-access-token";

describe("getMe", () => {
  it("keeps only uuid, email and names, with the bearer token", async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${API}/user/me`, ({ request }) => {
        authorization = request.headers.get("Authorization");
        return HttpResponse.json({
          uuid: "01a13475-7bff-70a3-82c1-7d4f4a5ed7ef",
          email: "camille@example.com",
          firstName: "Camille",
          lastName: "Testeur",
          phoneNumber: "+33600000000",
          birthDate: "1990-01-01T00:00:00",
        });
      }),
    );
    expect(await getMe(TOKEN)).toEqual({
      uuid: "01a13475-7bff-70a3-82c1-7d4f4a5ed7ef",
      email: "camille@example.com",
      firstName: "Camille",
      lastName: "Testeur",
    });
    expect(authorization).toBe(`Bearer ${TOKEN}`);
    expect(allLoggedText()).not.toContain(TOKEN);
  });

  it("maps 401 to unauthenticated", async () => {
    server.use(
      http.get(`${API}/user/me`, () =>
        HttpResponse.json(errorBody("AUTHENTICATION_REQUIRED", 401), { status: 401 }),
      ),
    );
    await expect(getMe(TOKEN)).rejects.toMatchObject({ frontCode: "unauthenticated" });
    await expect(getMe(TOKEN)).rejects.toBeInstanceOf(ApiError);
  });
});
