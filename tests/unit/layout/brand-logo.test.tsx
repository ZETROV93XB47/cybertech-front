/**
 * The cybertech logo (feature 005, T051): each variant shows its file with its text alternative
 * and its theme height, and the footer signs the page with the full lockup.
 *
 * @see specs/005-web-push-notifications/tasks.md Phase 7
 */
import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";

import { BrandLogo, BrandLogoVariant } from "@/components/layout/BrandLogo";
import { Footer } from "@/components/layout/Footer";
import { SITE_MESSAGES } from "@/features/common/messages";

describe("BrandLogo", () => {
  it("shows the mark and the wordmark at the header height", () => {
    render(<BrandLogo variant={BrandLogoVariant.WORDMARK} isPriority />);
    const image = screen.getByRole("img", { name: SITE_MESSAGES.name });
    expect(image.getAttribute("src")).toContain("cybertech-wordmark");
    expect(image).toHaveClass("h-logo-header", "w-auto");
  });

  it("shows the full lockup at the footer height", () => {
    render(<BrandLogo variant={BrandLogoVariant.LOCKUP} />);
    const image = screen.getByRole("img", { name: SITE_MESSAGES.logoLockupAlt });
    expect(image.getAttribute("src")).toContain("cybertech-lockup");
    expect(image).toHaveClass("h-logo-footer");
  });
});

describe("Footer", () => {
  it("signs the page with the logo above the note", async () => {
    const { container } = render(<Footer />);
    const footer = screen.getByRole("contentinfo");
    expect(screen.getByRole("img", { name: SITE_MESSAGES.logoLockupAlt })).toBeInTheDocument();
    expect(footer).toHaveTextContent(SITE_MESSAGES.footerNote);
    expect(await axe(container)).toHaveNoViolations();
  });
});
