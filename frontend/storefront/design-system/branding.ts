import type { CSSProperties } from "react";
import type { AgencyBranding } from "@/features/agency/types";

/**
 * Maps Agency branding onto the storefront's semantic design tokens.
 *
 * Themes consume tokens (`var(--primary)`) — never the branding object — so
 * changing an Agency's colors requires no Theme change.
 */
export function brandingToCssVars(branding: AgencyBranding): CSSProperties {
  return {
    "--primary": branding.primaryColor,
    "--ring": branding.primaryColor,
  } as CSSProperties;
}