"use client";

/**
 * Open state of a disclosure that opens on pointer hover as well as on click and keyboard (the
 * header account menu).
 *
 * - A mouse entering the trigger or the panel opens it; leaving both closes it after
 *   `ACCOUNT_MENU_CLOSE_DELAY_MS`, so the pointer can cross the gap between them.
 * - A click toggles it, except right after a hover opening, where it pins it open instead (the
 *   user who hovers then clicks expects the menu to stay).
 * - Escape closes it and gives focus back to the trigger; a pointer press outside or the focus
 *   leaving the whole disclosure closes it.
 *
 * @see specs/003-account-orders/spec.md FR-040
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";

import { ACCOUNT_MENU_CLOSE_DELAY_MS } from "@/lib/constants/auth";

/** Pointer type of a mouse (touch and pen open the menu by tapping, not by hovering). */
const MOUSE_POINTER = "mouse";

/** Key closing the disclosure. */
const ESCAPE_KEY = "Escape";

/** Handlers and state returned by {@link useHoverDisclosure}. */
export interface HoverDisclosure {
  readonly isOpen: boolean;
  /** Wrapper of the trigger and the panel (outside clicks and focus are measured against it). */
  readonly rootRef: RefObject<HTMLDivElement | null>;
  /** Trigger, focused again after Escape. */
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
  readonly open: () => void;
  readonly close: () => void;
  readonly onTriggerClick: () => void;
  readonly onPointerEnter: (event: PointerEvent) => void;
  readonly onPointerLeave: (event: PointerEvent) => void;
  readonly onKeyDown: (event: KeyboardEvent) => void;
  readonly onBlur: (event: FocusEvent) => void;
}

/**
 * Closes the disclosure on a pointer press outside its wrapper.
 *
 * @param isOpen - Whether the disclosure is open.
 * @param rootRef - Wrapper of the trigger and the panel.
 * @param close - Closes the disclosure.
 */
function useOutsidePress(
  isOpen: boolean,
  rootRef: RefObject<HTMLDivElement | null>,
  close: () => void,
): void {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onPress = (event: globalThis.PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener("pointerdown", onPress);
    return () => {
      document.removeEventListener("pointerdown", onPress);
    };
  }, [isOpen, rootRef, close]);
}

/**
 * Timer closing the disclosure after the hover delay.
 *
 * @param setOpen - State setter.
 * @returns Functions to schedule and cancel the delayed close.
 */
function useDelayedClose(setOpen: (open: boolean) => void): {
  readonly schedule: () => void;
  readonly cancel: () => void;
} {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback((): void => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  const schedule = useCallback((): void => {
    cancel();
    timer.current = setTimeout(() => {
      setOpen(false);
    }, ACCOUNT_MENU_CLOSE_DELAY_MS);
  }, [cancel, setOpen]);
  useEffect(() => cancel, [cancel]);
  return { schedule, cancel };
}

/** State shared by the handlers of {@link useHoverDisclosure}. */
interface DisclosureContext {
  readonly isOpen: boolean;
  readonly setOpen: (open: boolean) => void;
  /** Whether the current opening came from a hover (a click then pins it). */
  readonly openedByHover: { current: boolean };
  readonly rootRef: RefObject<HTMLDivElement | null>;
  readonly triggerRef: RefObject<HTMLButtonElement | null>;
  readonly open: () => void;
  readonly close: () => void;
  readonly scheduleClose: () => void;
}

/**
 * Pointer handlers: a mouse opens on enter and closes after the delay on leave.
 *
 * @param context - Shared state.
 * @returns The enter and leave handlers.
 */
function pointerHandlers(
  context: DisclosureContext,
): Pick<HoverDisclosure, "onPointerEnter" | "onPointerLeave"> {
  return {
    onPointerEnter: (event) => {
      if (event.pointerType !== MOUSE_POINTER) {
        return;
      }
      context.openedByHover.current = !context.isOpen || context.openedByHover.current;
      context.open();
    },
    onPointerLeave: (event) => {
      if (event.pointerType === MOUSE_POINTER && context.openedByHover.current) {
        context.scheduleClose();
      }
    },
  };
}

/**
 * Click, keyboard and focus handlers.
 *
 * @param context - Shared state.
 * @returns The click, Escape and focus-out handlers.
 */
function interactionHandlers(
  context: DisclosureContext,
): Pick<HoverDisclosure, "onTriggerClick" | "onKeyDown" | "onBlur"> {
  return {
    onTriggerClick: () => {
      if (context.isOpen && context.openedByHover.current) {
        context.openedByHover.current = false;
        return;
      }
      context.setOpen(!context.isOpen);
    },
    onKeyDown: (event) => {
      if (event.key === ESCAPE_KEY && context.isOpen) {
        context.close();
        context.triggerRef.current?.focus();
      }
    },
    onBlur: (event) => {
      if (!context.rootRef.current?.contains(event.relatedTarget)) {
        context.close();
      }
    },
  };
}

/**
 * Hover + click + keyboard disclosure.
 *
 * @returns The open state, the refs to attach and the event handlers.
 */
export function useHoverDisclosure(): HoverDisclosure {
  const [isOpen, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const openedByHover = useRef(false);
  const delayed = useDelayedClose(setOpen);
  const open = useCallback((): void => {
    delayed.cancel();
    setOpen(true);
  }, [delayed]);
  const close = useCallback((): void => {
    delayed.cancel();
    openedByHover.current = false;
    setOpen(false);
  }, [delayed]);
  useOutsidePress(isOpen, rootRef, close);
  const context: DisclosureContext = {
    isOpen,
    setOpen,
    openedByHover,
    rootRef,
    triggerRef,
    open,
    close,
    scheduleClose: delayed.schedule,
  };
  return {
    isOpen,
    rootRef,
    triggerRef,
    open,
    close,
    ...pointerHandlers(context),
    ...interactionHandlers(context),
  };
}
