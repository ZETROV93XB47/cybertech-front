/**
 * « Sois prévenu quand ta commande est expédiée » (feature 005, T015): text and action of every
 * state, actions wired to the clicks, announcements, and accessibility.
 *
 * @see specs/005-web-push-notifications/spec.md US1, FR-005
 */
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PushOptIn } from "@/features/notifications/components/PushOptIn";
import { PUSH_MESSAGES } from "@/features/notifications/messages";
import { resetPushStatus, setPushStatus } from "@/features/notifications/push-store";
import { PushState } from "@/lib/enums/push";

import { installPushBrowser } from "../../helpers/push-browser";

const activation = vi.hoisted(() => ({ enablePush: vi.fn(), reclaimPush: vi.fn() }));
vi.mock("@/features/notifications/push-activation", () => activation);

/**
 * Renders the card in a state.
 *
 * @param state - State to show.
 * @param message - Optional error text.
 * @returns The render result.
 */
function renderIn(state: PushState, message?: string): ReturnType<typeof render> {
  const view = render(<PushOptIn />);
  act(() => {
    setPushStatus({ state, message });
  });
  return view;
}

beforeEach(() => {
  resetPushStatus();
  installPushBrowser();
  activation.enablePush.mockReset().mockResolvedValue(undefined);
  activation.reclaimPush.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PushOptIn", () => {
  it("offers to turn notifications on, and enables them on click", async () => {
    const { container } = renderIn(PushState.IDLE);
    expect(screen.getByRole("heading", { name: PUSH_MESSAGES.optInTitle })).toBeInTheDocument();
    expect(screen.getByText(PUSH_MESSAGES.optInBody)).toHaveAttribute("aria-live", "polite");
    await userEvent.setup().click(screen.getByRole("button", { name: PUSH_MESSAGES.enable }));
    expect(activation.enablePush).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("disables the button while the activation runs", () => {
    renderIn(PushState.PENDING);
    expect(screen.getByRole("button", { name: PUSH_MESSAGES.enabling })).toBeDisabled();
  });

  it("confirms once enabled, without any button", async () => {
    const { container } = renderIn(PushState.ENABLED);
    expect(screen.getByRole("heading", { name: PUSH_MESSAGES.enabledTitle })).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("explains how to allow blocked notifications, without asking again", () => {
    renderIn(PushState.DENIED);
    expect(screen.getByText(PUSH_MESSAGES.denied)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each([
    [PushState.UNAVAILABLE, PUSH_MESSAGES.unavailable],
    [PushState.ERROR, PUSH_MESSAGES.error],
  ])("lets the customer retry in %s", (state, text) => {
    renderIn(state);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: PUSH_MESSAGES.enable })).toBeEnabled();
  });

  it("shows the expired-session text of an error", () => {
    renderIn(PushState.ERROR, PUSH_MESSAGES.sessionExpired);
    expect(screen.getByText(PUSH_MESSAGES.sessionExpired)).toBeInTheDocument();
  });

  it("offers to enable them for this account after a conflict", async () => {
    renderIn(PushState.CONFLICT);
    expect(screen.getByText(PUSH_MESSAGES.conflict)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: PUSH_MESSAGES.reclaim }));
    expect(activation.reclaimPush).toHaveBeenCalledOnce();
  });

  it("explains the home-screen app on iPhone, without a useless button", () => {
    renderIn(PushState.INSTALL_REQUIRED);
    expect(screen.getByText(PUSH_MESSAGES.installRequired)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders nothing in a browser without push", () => {
    const { container } = renderIn(PushState.UNSUPPORTED);
    expect(container).toBeEmptyDOMElement();
  });

  it("never mentions an amount", () => {
    const texts = Object.values(PUSH_MESSAGES).join(" ");
    expect(texts).not.toMatch(/€|\d+[,.]\d{2}/);
  });
});
