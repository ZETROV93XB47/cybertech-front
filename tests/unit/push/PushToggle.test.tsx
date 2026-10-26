/**
 * « Notifications du navigateur » in the profile (feature 005, T029): switch state and text of
 * every state, actions wired to the switch and the keyboard, reclaim after a conflict, and
 * accessibility.
 *
 * @see specs/005-web-push-notifications/spec.md US2, FR-005, FR-008
 */
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PushToggle } from "@/features/notifications/components/PushToggle";
import { PUSH_MESSAGES } from "@/features/notifications/messages";
import { resetPushStatus, setPushStatus } from "@/features/notifications/push-store";
import { PushState } from "@/lib/enums/push";

import { installPushBrowser } from "../../helpers/push-browser";

const activation = vi.hoisted(() => ({
  enablePush: vi.fn(),
  reclaimPush: vi.fn(),
  disablePush: vi.fn(),
}));
vi.mock("@/features/notifications/push-activation", () => activation);

/**
 * Renders the section in a state.
 *
 * @param state - State to show.
 * @param message - Optional error text.
 * @returns The render result.
 */
function renderIn(state: PushState, message?: string): ReturnType<typeof render> {
  const view = render(<PushToggle />);
  act(() => {
    setPushStatus({ state, message });
  });
  return view;
}

/**
 * Finds the switch by its accessible name.
 *
 * @returns The switch.
 */
function theSwitch(): HTMLElement {
  return screen.getByRole("switch", { name: PUSH_MESSAGES.toggleLabel });
}

beforeEach(() => {
  resetPushStatus();
  installPushBrowser();
  activation.enablePush.mockReset().mockResolvedValue(undefined);
  activation.reclaimPush.mockReset().mockResolvedValue(undefined);
  activation.disablePush.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PushToggle", () => {
  it("is off when idle, and turns notifications on when toggled", async () => {
    const { container } = renderIn(PushState.IDLE);
    expect(theSwitch()).not.toBeChecked();
    expect(theSwitch()).toHaveAccessibleDescription(PUSH_MESSAGES.toggleDescription);
    expect(screen.getByText(PUSH_MESSAGES.toggleDescription)).toHaveAttribute(
      "aria-live",
      "polite",
    );
    await userEvent.setup().click(theSwitch());
    expect(activation.enablePush).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("is on when enabled, and turns notifications off with the keyboard", async () => {
    const { container } = renderIn(PushState.ENABLED);
    expect(theSwitch()).toBeChecked();
    expect(theSwitch()).toHaveAccessibleDescription(PUSH_MESSAGES.toggleEnabled);
    theSwitch().focus();
    await userEvent.setup().keyboard(" ");
    expect(activation.disablePush).toHaveBeenCalledOnce();
    expect(activation.enablePush).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("stays on and says so when turning off failed", () => {
    renderIn(PushState.ENABLED, PUSH_MESSAGES.disableError);
    expect(theSwitch()).toBeChecked();
    expect(screen.getByText(PUSH_MESSAGES.disableError)).toBeInTheDocument();
  });

  it.each([
    [PushState.PENDING, PUSH_MESSAGES.toggleDescription],
    [PushState.DENIED, PUSH_MESSAGES.denied],
    [PushState.UNAVAILABLE, PUSH_MESSAGES.unavailable],
    [PushState.INSTALL_REQUIRED, PUSH_MESSAGES.installRequired],
  ])("disables the switch in %s and explains why", (state, text) => {
    renderIn(state);
    expect(theSwitch()).toBeDisabled();
    expect(theSwitch()).not.toBeChecked();
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("lets the customer retry after an error", () => {
    renderIn(PushState.ERROR, PUSH_MESSAGES.sessionExpired);
    expect(theSwitch()).toBeEnabled();
    expect(screen.getByText(PUSH_MESSAGES.sessionExpired)).toBeInTheDocument();
  });

  it("offers to enable them for this account after a conflict", async () => {
    renderIn(PushState.CONFLICT);
    expect(screen.getByText(PUSH_MESSAGES.conflict)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: PUSH_MESSAGES.reclaim }));
    expect(activation.reclaimPush).toHaveBeenCalledOnce();
  });

  it("renders nothing in a browser without push", () => {
    const { container } = renderIn(PushState.UNSUPPORTED);
    expect(container).toBeEmptyDOMElement();
  });
});
