/**
 * Feature 004, US5 (T052) — review components: star rating, review form, « Mes avis » lists, empty
 * state, and the product page reviews with « Voir plus d'avis ».
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { http, HttpResponse } from "msw";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ProductReviewsSection } from "@/features/catalog/components/ProductReviews";
import { NO_REVIEWS, type ProductReviews } from "@/features/catalog/reviews";
import { MyReviewsPanel } from "@/features/reviews/components/MyReviewsPanel";
import { StarRatingInput } from "@/features/reviews/components/StarRatingInput";
import type { MyReviewsView } from "@/features/reviews/my-reviews-view";
import type { ReviewFormState } from "@/features/reviews/review-state";
import { ReviewField, ReviewFormStatus } from "@/lib/enums/review";

import { renderWithProviders } from "../../helpers/providers";
import { server } from "../../msw/server";

import { ORDER_UUID, OTHER_PRODUCT, PRODUCT_UUID, PUBLIC_REVIEW, REVIEW_UUID } from "./fixtures";

const actions = vi.hoisted(() => ({
  createReview: vi.fn(),
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
}));
vi.mock("@/features/reviews/actions", () => actions);

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/account/reviews",
  useRouter: () => navigation,
}));

beforeAll(() => {
  // The Radix radio group measures its hidden form input; jsdom has no ResizeObserver.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

afterEach(() => {
  actions.createReview.mockReset();
  actions.updateReview.mockReset();
  actions.deleteReview.mockReset();
  navigation.refresh.mockClear();
});

/** « Mes avis » with one product to review and one published review. */
const VIEW: MyReviewsView = {
  toReview: [
    {
      id: `${PRODUCT_UUID}:${ORDER_UUID}`,
      productUuid: PRODUCT_UUID,
      orderUuid: ORDER_UUID,
      productName: "Écran 27 pouces",
      productHref: `/products/${PRODUCT_UUID}`,
      orderedOn: "12 octobre 2026",
    },
  ],
  published: [
    {
      uuid: REVIEW_UUID,
      productUuid: OTHER_PRODUCT,
      productName: "Montre GT",
      productHref: `/products/${OTHER_PRODUCT}`,
      rating: 5,
      comment: "Parfaite.",
      postedOn: "14 octobre 2026",
      editedOn: "16 octobre 2026",
    },
  ],
  page: 1,
  totalPages: 1,
};

/**
 * State returned by a mocked action.
 *
 * @param state - Fields of the state.
 * @returns The full state.
 */
function stateOf(state: Partial<ReviewFormState>): ReviewFormState {
  return { status: ReviewFormStatus.ERROR, rating: 4, comment: "", fieldErrors: {}, ...state };
}

/**
 * Opens the form of the product to review, picks 4 stars and types a comment.
 *
 * @param comment - Comment to type.
 * @returns The user-event instance.
 */
async function fillCreateForm(comment: string): Promise<ReturnType<typeof userEvent.setup>> {
  const user = userEvent.setup();
  renderWithProviders(<MyReviewsPanel view={VIEW} initialOpenId={null} />);
  await user.click(screen.getByRole("button", { name: "Donner ton avis sur Écran 27 pouces" }));
  await user.click(screen.getByRole("radio", { name: "4 étoiles" }));
  await user.type(screen.getByRole("textbox", { name: "Ton commentaire (facultatif)" }), comment);
  return user;
}

describe("StarRatingInput", () => {
  it("is a radio group of five stars, changed with the arrows", async () => {
    const user = userEvent.setup();
    const { container } = render(<StarRatingInput defaultValue={2} />);
    const group = screen.getByRole("radiogroup", { name: "Ta note" });
    expect(
      within(group)
        .getAllByRole("radio")
        .map((radio) => radio.getAttribute("aria-label")),
    ).toEqual(["1 étoile", "2 étoiles", "3 étoiles", "4 étoiles", "5 étoiles"]);
    expect(screen.getByRole("radio", { name: "2 étoiles" })).toBeChecked();
    screen.getByRole("radio", { name: "2 étoiles" }).focus();
    // Radix moves the focus on the next tick and checks the radio while the arrow is still down.
    await user.keyboard("{ArrowRight>}");
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: "3 étoiles" })).toBeChecked();
    });
    await user.keyboard("{/ArrowRight}");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the field error", () => {
    render(<StarRatingInput defaultValue={null} error="Choisis une note de 1 à 5 étoiles." />);
    expect(screen.getByText("Choisis une note de 1 à 5 étoiles.")).toBeVisible();
  });
});

describe("review form", () => {
  it("counts the characters of the comment", async () => {
    await fillCreateForm("Bien");
    expect(screen.getByText("4 / 1 000")).toBeVisible();
  });

  it("sends the rating, the comment and the identifiers, then announces the publication", async () => {
    actions.createReview.mockResolvedValue(stateOf({ status: ReviewFormStatus.SUCCESS }));
    const user = await fillCreateForm("Bien");
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));
    const data = actions.createReview.mock.calls[0]?.[1] as FormData;
    expect(data.get(ReviewField.RATING)).toBe("4");
    expect(data.get(ReviewField.COMMENT)).toBe("Bien");
    expect(data.get(ReviewField.ORDER_UUID)).toBe(ORDER_UUID);
    expect(data.get(ReviewField.PRODUCT_UUID)).toBe(PRODUCT_UUID);
    const live = screen.getAllByRole("status").find((region) => region.textContent !== "");
    await waitFor(() => {
      expect(screen.getByText("Merci ! Ton avis est publié.")).toBeVisible();
    });
    expect(live ?? null).not.toBeUndefined();
  });

  it("keeps the rating and the comment when the moderation refuses it", async () => {
    actions.createReview.mockResolvedValue(
      stateOf({
        comment: "Mauvais mot",
        formError:
          "Ton commentaire n'a pas pu être publié tel quel : reformule-le, ta note et ton texte sont gardés.",
      }),
    );
    const user = await fillCreateForm("Mauvais mot");
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));
    expect(await screen.findByText(/reformule-le/)).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Ton commentaire (facultatif)" })).toHaveValue(
      "Mauvais mot",
    );
    expect(screen.getByRole("radio", { name: "4 étoiles" })).toBeChecked();
  });

  it("offers to sign in again when the session expired, without resending", async () => {
    actions.createReview.mockResolvedValue(
      stateOf({ formError: "Ta session a expiré.", needsSignIn: true }),
    );
    const user = await fillCreateForm("Bien");
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));
    expect(await screen.findByRole("link", { name: "Me reconnecter" })).toHaveAttribute(
      "href",
      "/login?callbackUrl=%2Faccount%2Freviews",
    );
    expect(actions.createReview).toHaveBeenCalledTimes(1);
  });

  it("refreshes the lists when the product can no longer be reviewed", async () => {
    actions.createReview.mockResolvedValue(stateOf({ formError: "Ce produit…", isStale: true }));
    const user = await fillCreateForm("Bien");
    await user.click(screen.getByRole("button", { name: "Publier mon avis" }));
    await waitFor(() => {
      expect(navigation.refresh).toHaveBeenCalled();
    });
  });
});

describe("« Mes avis »", () => {
  it("lists the product to review and the published review", async () => {
    const { container } = renderWithProviders(<MyReviewsPanel view={VIEW} initialOpenId={null} />);
    const toReview = screen.getByRole("list", { name: "Produits à noter" });
    expect(within(toReview).getByText("Commandé le 12 octobre 2026")).toBeVisible();
    const published = screen.getByRole("list", { name: "Avis publiés" });
    expect(within(published).getByText(/modifié le 16 octobre 2026/)).toBeVisible();
    expect(within(published).getByRole("link", { name: "Montre GT" })).toHaveAttribute(
      "href",
      `/products/${OTHER_PRODUCT}`,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("opens the form of the product named in the address", () => {
    renderWithProviders(
      <MyReviewsPanel view={VIEW} initialOpenId={`${PRODUCT_UUID}:${ORDER_UUID}`} />,
    );
    expect(screen.getByRole("form", { name: "Donner ton avis sur Écran 27 pouces" })).toBeVisible();
  });

  it("edits a review in place with its current rating and comment", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyReviewsPanel view={VIEW} initialOpenId={null} />);
    await user.click(screen.getByRole("button", { name: "Modifier ton avis sur Montre GT" }));
    expect(screen.getByRole("radio", { name: "5 étoiles" })).toBeChecked();
    expect(screen.getByRole("textbox", { name: "Ton commentaire (facultatif)" })).toHaveValue(
      "Parfaite.",
    );
  });

  it("deletes a review after confirmation and announces it", async () => {
    actions.deleteReview.mockResolvedValue({ status: ReviewFormStatus.SUCCESS });
    const user = userEvent.setup();
    renderWithProviders(<MyReviewsPanel view={VIEW} initialOpenId={null} />);
    await user.click(screen.getByRole("button", { name: "Supprimer ton avis sur Montre GT" }));
    const dialog = screen.getByRole("dialog", { name: "Supprimer ton avis ?" });
    await user.click(within(dialog).getByRole("button", { name: "Supprimer mon avis" }));
    expect(actions.deleteReview).toHaveBeenCalledWith({
      reviewUuid: REVIEW_UUID,
      productUuid: OTHER_PRODUCT,
    });
    expect(await screen.findByText(/Ton avis a été supprimé/)).toBeVisible();
  });

  it("keeps the review when the deletion is cancelled", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MyReviewsPanel view={VIEW} initialOpenId={null} />);
    await user.click(screen.getByRole("button", { name: "Supprimer ton avis sur Montre GT" }));
    await user.click(screen.getByRole("button", { name: "Garder mon avis" }));
    expect(actions.deleteReview).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Supprimer ton avis sur Montre GT" })).toHaveFocus();
  });

  it("shows an illustrated empty state when there is nothing", () => {
    renderWithProviders(
      <MyReviewsPanel
        view={{ toReview: [], published: [], page: 1, totalPages: 0 }}
        initialOpenId={null}
      />,
    );
    expect(screen.getByRole("heading", { name: "Rien à noter pour l'instant" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Parcourir le catalogue" })).toHaveAttribute(
      "href",
      "/products",
    );
  });
});

describe("product page reviews", () => {
  /** First page of twelve reviews. */
  const REVIEWS: ProductReviews = {
    average: 4.3,
    count: 12,
    distribution: { 5: 6, 4: 4, 3: 1, 2: 1, 1: 0 },
    items: [PUBLIC_REVIEW, { ...PUBLIC_REVIEW, uuid: OTHER_PRODUCT, authorFirstName: null }],
    page: 0,
    hasMore: true,
  };

  it("shows the first name, the date and loads the next page on request", async () => {
    server.use(
      http.get(`*/api/products/${PRODUCT_UUID}/reviews`, () =>
        HttpResponse.json({
          ...REVIEWS,
          items: [{ ...PUBLIC_REVIEW, uuid: ORDER_UUID, authorFirstName: "Léo" }],
          page: 1,
          hasMore: false,
        }),
      ),
    );
    const user = userEvent.setup();
    const { container } = render(
      <ProductReviewsSection productUuid={PRODUCT_UUID} reviews={REVIEWS} />,
    );
    const list = screen.getByRole("list", { name: "Avis des clients" });
    expect(within(list).getByText("Camille")).toBeVisible();
    expect(within(list).getByText("Client")).toBeVisible();
    expect(within(list).getAllByText("le 14 octobre 2026")).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "Voir plus d'avis" }));
    expect(await within(list).findByText("Léo")).toBeVisible();
    expect(screen.getByText("1 avis de plus affiché.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Voir plus d'avis" })).not.toBeInTheDocument();
  });

  it("shows the honest empty state without any figure", () => {
    render(<ProductReviewsSection productUuid={PRODUCT_UUID} reviews={NO_REVIEWS} />);
    expect(screen.getByText("Aucun avis pour l'instant")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Voir plus d'avis" })).not.toBeInTheDocument();
  });
});
