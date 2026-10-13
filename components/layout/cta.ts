/**
 * Look of the primary call to action, the same on every page (gradient, large size), always
 * wrapped in `MagneticButton` (feature 002, T068).
 */
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Classes of the primary call-to-action link. */
export const PRIMARY_CTA_CLASS = cn(buttonVariants({ size: "lg" }), "cta-gradient");
