"use client";

/**
 * « Catalogue » entry of the main navigation: a trigger opening, on hover, click, Enter or
 * Space, a panel with « Tout le catalogue » then one link per active category (icon, name and
 * number of products when known).
 *
 * Built on the Radix `NavigationMenu` (research R3): Tab and Enter reach and follow every link,
 * Escape closes the panel and gives the focus back to the trigger, `aria-expanded` and
 * `aria-controls` are managed. A click right after a hover opening keeps the panel open instead
 * of closing it (the user who hovers then clicks expects the menu to stay), as in the account
 * menu. The panel drops in at full effects; reduced or disabled effects and
 * `prefers-reduced-motion` give the static panel.
 *
 * @see specs/004-catalog-promos-reviews/spec.md US2
 * @see specs/004-catalog-promos-reviews/research.md R3
 */
import { ChevronDown, ChevronRight, LayoutGrid, type LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { NavigationMenu } from "radix-ui";
import { useCallback, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { CATEGORY_ICONS } from "@/features/catalog/category-icons";
import { CATALOG_MENU_MESSAGES, CATEGORY_LABELS } from "@/features/catalog/messages";
import { buildSearchUrl } from "@/features/catalog/search-params";
import { SITE_MESSAGES } from "@/features/common/messages";
import { CATALOG_PATH } from "@/lib/constants/routes";
import type { CategoryKey } from "@/lib/enums/category-key";
import { EntranceMode } from "@/lib/enums/entrance-mode";
import { EMPTY_SEARCH_FILTERS } from "@/lib/schemas/search";
import { cn } from "@/lib/utils";
import { useMotionTokens, useSurfaceMotion } from "@/styles/motion";

import { NAV_ITEM_CLASS } from "./header-controls";
import { NavUnderline } from "./NavUnderline";

/** Value of the « Catalogue » item in the navigation menu (Radix item value). */
export const CATALOG_MENU_VALUE = "catalog";

/** Vertical offset of the panel at the start of its opening, in Motion units (pixels). */
const PANEL_DROP_OFFSET = -6;

/** Scale of the panel at the start of its opening (it grows from the trigger). */
const PANEL_START_SCALE = 0.96;

/** The panel grows from the trigger, at its top left corner. */
const PANEL_ORIGIN = { transformOrigin: "top left" } as const;

/** Style of every row of the panel. */
const ROW_CLASS =
  "group relative flex w-full items-center gap-3 rounded-button px-3 py-2.5 text-sm text-text-muted transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-text focus-visible:bg-surface-2 focus-visible:text-text";

/** Number of products of each category; `null` or missing when unknown. */
export type CategoryCounts = Readonly<Partial<Record<CategoryKey, number | null>>>;

/** Props of {@link CatalogMenu}. */
export interface CatalogMenuProps {
  /** Active categories, in display order (`getActiveCategories`). */
  readonly categories: readonly CategoryKey[];
  /** Number of products of each category (`getCategoryCounts`). */
  readonly counts: CategoryCounts;
  /** Whether the catalog is the current section (trigger underlined). */
  readonly isCurrent: boolean;
  /** Category of the page shown, marked in the panel; `null` when none. */
  readonly currentCategory: CategoryKey | null;
  /** Whether the whole catalog, without category, is the page shown. */
  readonly isAllCatalogCurrent: boolean;
  /** Whether the panel is open (controlled by the navigation root). */
  readonly isOpen: boolean;
  /** Click handler of the trigger ({@link useCatalogMenuState}). */
  readonly onTriggerClick: (event: MouseEvent) => void;
}

/** Props of one row of the panel. */
interface MenuRowProps {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly label: string;
  /** Text under the label, or the product count on the right; omitted when unknown. */
  readonly detail?: string | undefined;
  readonly isCurrent: boolean;
}

/**
 * One link of the panel: current-category pill, icon, name, count and a chevron on hover.
 *
 * @param props - Address, icon, texts and current state.
 * @returns The list item.
 */
function MenuRow({ href, icon: Icon, label, detail, isCurrent }: MenuRowProps): ReactNode {
  return (
    <li>
      <NavigationMenu.Link asChild active={isCurrent}>
        <Link
          href={href}
          aria-current={isCurrent ? "page" : undefined}
          className={cn(ROW_CLASS, isCurrent && "bg-surface-2 font-medium text-text")}
        >
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-2 left-1 w-1 rounded-full bg-gold transition-opacity duration-(--duration-fast)",
              isCurrent ? "opacity-100" : "opacity-0",
            )}
          />
          <Icon
            aria-hidden
            className={cn(
              "size-4 shrink-0 transition-transform duration-(--duration-fast) group-hover:translate-x-0.5 group-hover:text-brand-text",
              isCurrent && "text-gold",
            )}
          />
          <span className="flex-1 whitespace-nowrap">{label}</span>
          {detail !== undefined && (
            <span className="font-mono text-xs text-text-muted tabular-nums">{detail}</span>
          )}
          <ChevronRight
            aria-hidden
            className="size-4 -translate-x-1 opacity-0 transition duration-(--duration-fast) group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        </Link>
      </NavigationMenu.Link>
    </li>
  );
}

/**
 * Count label of a category, when its number of products is known.
 *
 * @param count - Number of products, `null` or `undefined` when unknown.
 * @returns « 616 produits », or `undefined`.
 */
function countLabel(count: number | null | undefined): string | undefined {
  return count === null || count === undefined ? undefined : CATALOG_MENU_MESSAGES.count(count);
}

/**
 * Links of the panel: « Tout le catalogue » then the categories.
 *
 * @param props - Categories, counts and current page.
 * @returns The link list.
 */
function MenuLinks({
  categories,
  counts,
  currentCategory,
  isAllCatalogCurrent,
}: Omit<CatalogMenuProps, "isCurrent" | "isOpen" | "onTriggerClick">): ReactNode {
  return (
    <ul aria-label={CATALOG_MENU_MESSAGES.panelLabel} className="flex flex-col gap-0.5">
      <MenuRow
        href={CATALOG_PATH}
        icon={LayoutGrid}
        label={CATALOG_MENU_MESSAGES.allCatalog}
        isCurrent={isAllCatalogCurrent}
      />
      <li aria-hidden className="mx-3 my-1 border-t border-border" />
      {categories.map((category) => (
        <MenuRow
          key={category}
          href={buildSearchUrl({ ...EMPTY_SEARCH_FILTERS, category })}
          icon={CATEGORY_ICONS[category]}
          label={CATEGORY_LABELS[category]}
          detail={countLabel(counts[category])}
          isCurrent={category === currentCategory}
        />
      ))}
    </ul>
  );
}

/** Open state of the navigation menu, returned by {@link useCatalogMenuState}. */
export interface CatalogMenuState {
  /** Radix value of the open item, `""` when every panel is closed. */
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** Click handler of the « Catalogue » trigger. */
  readonly onTriggerClick: (event: MouseEvent) => void;
}

/**
 * Open state of the navigation menu. Keeps the panel open when the trigger is clicked right after
 * a hover opening (Radix would close it), and lets the next click close it.
 *
 * @returns The controlled value and the trigger click handler.
 */
export function useCatalogMenuState(): CatalogMenuState {
  const [value, setValue] = useState("");
  const pinnedRef = useRef(false);
  const onValueChange = useCallback((next: string): void => {
    if (next === "") {
      pinnedRef.current = false;
    }
    setValue(next);
  }, []);
  const onTriggerClick = useCallback(
    (event: MouseEvent): void => {
      if (value === CATALOG_MENU_VALUE && !pinnedRef.current) {
        event.preventDefault();
      }
      pinnedRef.current = true;
    },
    [value],
  );
  return { value, onValueChange, onTriggerClick };
}

/**
 * « Catalogue » item of the main navigation.
 *
 * @param props - Categories, counts, current section, category and open state.
 * @returns The navigation item: trigger and, when open, its panel.
 */
export function CatalogMenu(props: CatalogMenuProps): ReactNode {
  const { isCurrent, isOpen, onTriggerClick, ...links } = props;
  const { mode } = useSurfaceMotion();
  const tokens = useMotionTokens();
  const isAnimated = mode === EntranceMode.MOVE;
  return (
    <NavigationMenu.Item value={CATALOG_MENU_VALUE} className="relative">
      <NavigationMenu.Trigger
        aria-current={isCurrent ? "page" : undefined}
        onClick={onTriggerClick}
        className={cn(NAV_ITEM_CLASS, isCurrent || isOpen ? "text-text" : "text-text-muted")}
      >
        {SITE_MESSAGES.catalogLink}
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 transition-transform duration-(--duration-fast)",
            isOpen && "rotate-180",
          )}
        />
        {isCurrent && <NavUnderline />}
      </NavigationMenu.Trigger>
      <NavigationMenu.Content className="absolute top-full left-0 z-50 pt-2">
        <motion.div
          data-entrance={isAnimated ? EntranceMode.MOVE : EntranceMode.FADE}
          initial={
            isAnimated ? { opacity: 0, y: PANEL_DROP_OFFSET, scale: PANEL_START_SCALE } : false
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={tokens.base}
          style={PANEL_ORIGIN}
          className="relative w-96 overflow-hidden rounded-card border border-border bg-surface p-2 shadow-card-hover"
        >
          <span aria-hidden className="cta-gradient absolute inset-x-0 top-0 h-0.5" />
          <MenuLinks {...links} />
        </motion.div>
      </NavigationMenu.Content>
    </NavigationMenu.Item>
  );
}
