// @vitest-environment node
/**
 * Feature 004, US5 (T050) — Server Actions of the reviews against a mocked backend: success and
 * refreshes, refusals mapped on the backend `errorCode` (never on the status), typed values kept,
 * nothing sent for an invalid input, and no comment nor first name in the logs.
 */
import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createReview, deleteReview, updateReview } from "@/features/reviews/actions";
import { initialReviewState } from "@/features/reviews/review-state";
import { ApiError } from "@/lib/api/errors";
import { FrontErrorCode } from "@/lib/enums/error-code";
import { ReviewField, ReviewFormStatus } from "@/lib/enums/review";

import { API, errorBody } from "../../helpers/cart";
import { allLoggedText } from "../../helpers/test-logger";
import { server } from "../../msw/server";

import { ORDER_UUID, PRODUCT_UUID, REVIEW_RESPONSE, REVIEW_UUID } from "./fixtures";

const guards = vi.hoisted(() => ({ getAccessTokenOrThrow: vi.fn() }));
vi.mock("@/lib/auth/guards", () => guards);
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("next/cache", () => cache);

/** A comment that must never reach the logs. */
const COMMENT = "Commentaire très personnel";

/** Initial state of the forms. */
const IDLE = initialReviewState({ rating: null, comment: "" });

/**
 * Form data of a review.
 *
 * @param fields - Fields of the form.
 * @returns The form data.
 */
function form(fields: Partial<Record<ReviewField, string>>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.append(name, value);
  }
  return data;
}

/** Form publishing 4 stars with {@link COMMENT}. */
const CREATE_FORM = {
  [ReviewField.ORDER_UUID]: ORDER_UUID,
  [ReviewField.PRODUCT_UUID]: PRODUCT_UUID,
  [ReviewField.RATING]: "4",
  [ReviewField.COMMENT]: COMMENT,
};

/**
 * Serves `POST /review/create` with an error.
 *
 * @param code - Backend error code.
 * @param status - HTTP status.
 */
function refuseCreate(code: string, status: number): void {
  server.use(
    http.post(`${API}/review/create`, () => HttpResponse.json(errorBody(code, status), { status })),
  );
}

beforeEach(() => {
  guards.getAccessTokenOrThrow.mockResolvedValue("token");
});

afterEach(() => {
  cache.revalidatePath.mockClear();
  cache.updateTag.mockClear();
});

describe("createReview", () => {
  it("publishes, then refreshes « Mes avis », the order and the product reviews", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.post(`${API}/review/create`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(REVIEW_RESPONSE, { status: 201 });
      }),
    );
    const state = await createReview(IDLE, form(CREATE_FORM));
    expect(state.status).toBe(ReviewFormStatus.SUCCESS);
    expect(bodies).toEqual([
      { orderUuid: ORDER_UUID, productUuid: PRODUCT_UUID, rating: 4, comment: COMMENT },
    ]);
    expect(cache.revalidatePath).toHaveBeenCalledWith("/account/reviews");
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/account/orders/${ORDER_UUID}`);
    expect(cache.updateTag).toHaveBeenCalledWith(`product-reviews:${PRODUCT_UUID}`);
    expect(allLoggedText()).not.toContain(COMMENT);
  });

  it("keeps the rating and the comment when the moderation refuses it", async () => {
    refuseCreate("COMMENT_POST_NOT_ALLOWED", 403);
    const state = await createReview(IDLE, form(CREATE_FORM));
    expect(state).toMatchObject({ status: ReviewFormStatus.ERROR, rating: 4, comment: COMMENT });
    expect(state.formError).toContain("reformule-le");
    expect(cache.updateTag).not.toHaveBeenCalled();
  });

  it("branches on ORDER_NOT_REVIEWABLE (409), not on the status", async () => {
    refuseCreate("ORDER_NOT_REVIEWABLE", 409);
    const state = await createReview(IDLE, form(CREATE_FORM));
    expect(state.isStale).toBe(true);
    expect(state.formError).toContain("ne peut plus être noté");
  });

  it("asks to sign in again on an expired session, keeping the input", async () => {
    guards.getAccessTokenOrThrow.mockRejectedValue(
      new ApiError({ status: 401, frontCode: FrontErrorCode.UNAUTHENTICATED, message: "expired" }),
    );
    const state = await createReview(IDLE, form(CREATE_FORM));
    expect(state).toMatchObject({ needsSignIn: true, rating: 4, comment: COMMENT });
  });

  it("announces the delay of a rate limit", async () => {
    server.use(
      http.post(`${API}/review/create`, () =>
        HttpResponse.json(errorBody("TOO_MANY_REQUESTS", 429), {
          status: 429,
          headers: { "Retry-After": "30" },
        }),
      ),
    );
    const state = await createReview(IDLE, form(CREATE_FORM));
    expect(state.retryAfterSeconds).toBe(30);
    expect(state.formError).toContain("30 s");
  });

  it("sends nothing without a rating", async () => {
    const calls = vi.fn();
    server.use(http.post(`${API}/review/create`, calls));
    const state = await createReview(IDLE, form({ ...CREATE_FORM, [ReviewField.RATING]: "" }));
    expect(state.fieldErrors[ReviewField.RATING]).toBeDefined();
    expect(state.comment).toBe(COMMENT);
    expect(calls).not.toHaveBeenCalled();
  });
});

describe("updateReview", () => {
  it("sends the new rating and an emptied comment, then refreshes", async () => {
    const bodies: unknown[] = [];
    server.use(
      http.patch(`${API}/review/update/${REVIEW_UUID}`, async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(REVIEW_RESPONSE);
      }),
    );
    const state = await updateReview(
      IDLE,
      form({
        [ReviewField.REVIEW_UUID]: REVIEW_UUID,
        [ReviewField.PRODUCT_UUID]: PRODUCT_UUID,
        [ReviewField.RATING]: "3",
        [ReviewField.COMMENT]: "",
      }),
    );
    expect(state.status).toBe(ReviewFormStatus.SUCCESS);
    expect(bodies).toEqual([{ reviewUuid: REVIEW_UUID, rating: 3, comment: "" }]);
    expect(cache.updateTag).toHaveBeenCalledWith(`product-reviews:${PRODUCT_UUID}`);
  });
});

describe("deleteReview", () => {
  it("deletes, and counts a review already gone as deleted", async () => {
    server.use(
      http.delete(`${API}/review/delete/${REVIEW_UUID}`, () =>
        HttpResponse.json(errorBody("REVIEW_NOT_FOUND", 404), { status: 404 }),
      ),
    );
    const state = await deleteReview({ reviewUuid: REVIEW_UUID, productUuid: PRODUCT_UUID });
    expect(state.status).toBe(ReviewFormStatus.SUCCESS);
    expect(cache.updateTag).toHaveBeenCalledWith(`product-reviews:${PRODUCT_UUID}`);
  });

  it("refuses a malformed input without calling the backend", async () => {
    const state = await deleteReview({ reviewUuid: "nope", productUuid: PRODUCT_UUID });
    expect(state.status).toBe(ReviewFormStatus.ERROR);
    expect(guards.getAccessTokenOrThrow).not.toHaveBeenCalled();
  });
});
