/**
 * Look of the primary call to action, the same on every page (gradient, large size, button
 * radius of the theme), always wrapped in `MagneticButton` (feature 002 T068, feature 003 T073).
 */
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Classes of the primary call-to-action link. */
export const PRIMARY_CTA_CLASS = cn(
  buttonVariants({ size: "lg" }),
  "cta-gradient h-12 rounded-button px-6",
);
