import type { Branding, TokenConfig } from "@theme-agency/sdk";
import { buildTokenCss } from "@theme-agency/sdk";
import type { BuildTokenCssResult } from "@theme-agency/sdk";

/**
 * Starter theme — three-layer design tokens.
 *
 *  primitive  — raw naming-only palette/spacing/type/radius values
 *  semantic   — roles components read (brand, text, surface, border, …);
 *               agency branding overrides these with literals
 *  component  — per-component tokens derived from semantic roles
 */

export const starterTokens: TokenConfig = {
  primitive: [
    // color - luxury teal travel palette (approved storefront design)
    { name: "color.brand.600", type: "color", value: "#0f766e" },
    { name: "color.brand.700", type: "color", value: "#115e59" },
    { name: "color.brand.800", type: "color", value: "#134e4a" },
    { name: "color.brand.100", type: "color", value: "#f0fdfa" },
    { name: "color.brand.soft", type: "color", value: "#e6f4f2" },
    { name: "color.accent.500", type: "color", value: "#f59e0b" },
    { name: "color.accent.600", type: "color", value: "#d97706" },
    { name: "color.accent.100", type: "color", value: "#fef3c7" },
    { name: "color.badge.sky.bg", type: "color", value: "#e0f2fe" },
    { name: "color.badge.sky.fg", type: "color", value: "#0369a1" },
    { name: "color.badge.amber.bg", type: "color", value: "#fef3c7" },
    { name: "color.badge.amber.fg", type: "color", value: "#b45309" },
    { name: "color.neutral.50", type: "color", value: "#f8fafc" },
    { name: "color.neutral.100", type: "color", value: "#f1f5f9" },
    { name: "color.neutral.200", type: "color", value: "#e2e8f0" },
    { name: "color.neutral.300", type: "color", value: "#cbd5e1" },
    { name: "color.neutral.400", type: "color", value: "#94a3b8" },
    { name: "color.neutral.500", type: "color", value: "#64748b" },
    { name: "color.neutral.700", type: "color", value: "#334155" },
    { name: "color.neutral.800", type: "color", value: "#1e293b" },
    { name: "color.neutral.900", type: "color", value: "#0f172a" },
    { name: "color.dark.900", type: "color", value: "#0f172a" },
    { name: "color.dark.950", type: "color", value: "#07101e" },
    { name: "color.dark.deep", type: "color", value: "#0b1526" },
    { name: "color.subtle", type: "color", value: "#f7f9f9" },
    { name: "color.white", type: "color", value: "#ffffff" },
    { name: "color.black", type: "color", value: "#000000" },
    // spacing
    { name: "spacing.1", type: "spacing", value: "0.25rem" },
    { name: "spacing.2", type: "spacing", value: "0.5rem" },
    { name: "spacing.3", type: "spacing", value: "0.75rem" },
    { name: "spacing.4", type: "spacing", value: "1rem" },
    { name: "spacing.5", type: "spacing", value: "1.25rem" },
    { name: "spacing.6", type: "spacing", value: "1.5rem" },
    { name: "spacing.8", type: "spacing", value: "2rem" },
    { name: "spacing.10", type: "spacing", value: "2.5rem" },
    { name: "spacing.12", type: "spacing", value: "3rem" },
    { name: "spacing.16", type: "spacing", value: "4rem" },
    { name: "spacing.20", type: "spacing", value: "5rem" },
    { name: "spacing.24", type: "spacing", value: "6rem" },
    { name: "spacing.30", type: "spacing", value: "7.5rem" },
    { name: "spacing.32", type: "spacing", value: "8rem" },
    // radius
    { name: "radius.xs", type: "radius", value: "0.25rem" },
    { name: "radius.sm", type: "radius", value: "0.375rem" },
    { name: "radius.md", type: "radius", value: "0.5rem" },
    { name: "radius.lg", type: "radius", value: "0.75rem" },
    { name: "radius.xl", type: "radius", value: "0.875rem" },
    { name: "radius.2xl", type: "radius", value: "1.25rem" },
    { name: "radius.3xl", type: "radius", value: "1.5rem" },
    { name: "radius.full", type: "radius", value: "9999px" },
    // typography
    { name: "font.family.sans", type: "font-size", value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
    { name: "font.family.serif", type: "font-size", value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
    { name: "font.size.xs", type: "font-size", value: "0.75rem" },
    { name: "font.size.sm", type: "font-size", value: "0.875rem" },
    { name: "font.size.md", type: "font-size", value: "1rem" },
    { name: "font.size.lg", type: "font-size", value: "1.125rem" },
    { name: "font.size.xl", type: "font-size", value: "1.3125rem" },
    { name: "font.size.2xl", type: "font-size", value: "1.5rem" },
    { name: "font.size.3xl", type: "font-size", value: "1.875rem" },
    { name: "font.size.4xl", type: "font-size", value: "2.25rem" },
    { name: "font.size.5xl", type: "font-size", value: "2.875rem" },
    { name: "font.size.display", type: "font-size", value: "clamp(2.625rem, 5vw + 1rem, 4.375rem)" },
    { name: "font.weight.normal", type: "font-weight", value: "400" },
    { name: "font.weight.medium", type: "font-weight", value: "500" },
    { name: "font.weight.semibold", type: "font-weight", value: "600" },
    { name: "font.weight.bold", type: "font-weight", value: "700" },
  ],
  semantic: [
    { name: "brand", type: "color", from: "color.brand.600" },
    { name: "brand-strong", type: "color", from: "color.brand.700" },
    { name: "brand-soft", type: "color", from: "color.brand.soft" },
    { name: "brand-fg", type: "color", from: "color.white" },
    { name: "accent", type: "color", from: "color.accent.500" },
    { name: "accent-soft", type: "color", from: "color.accent.100" },
    { name: "text", type: "color", from: "color.neutral.900" },
    { name: "text-muted", type: "color", from: "color.neutral.500" },
    { name: "surface", type: "color", from: "color.white" },
    { name: "surface-muted", type: "color", from: "color.neutral.50" },
    { name: "surface-subtle", type: "color", from: "color.subtle" },
    { name: "surface-alt", type: "color", from: "color.neutral.100" },
    { name: "surface-dark", type: "color", from: "color.dark.900" },
    { name: "surface-deep", type: "color", from: "color.dark.deep" },
    { name: "border", type: "color", from: "color.neutral.200" },
    { name: "border-subtle", type: "color", from: "color.neutral.100" },
  ],
  component: [
    { name: "header-bg", type: "color", from: "surface" },
    { name: "header-border", type: "color", from: "border" },
    { name: "header-link", type: "color", from: "text" },
    { name: "button-bg", type: "color", from: "brand" },
    { name: "button-fg", type: "color", from: "brand-fg" },
    { name: "button-bg-strong", type: "color", from: "brand-strong" },
    { name: "button-accent-bg", type: "color", from: "accent" },
    { name: "card-bg", type: "color", from: "surface" },
    { name: "card-border", type: "color", from: "border" },
    { name: "card-suffix", type: "color", from: "text-muted" },
    { name: "eyebrow-color", type: "color", from: "brand" },
    { name: "footer-bg", type: "color", from: "surface-dark" },
    { name: "footer-text", type: "color", from: "text-muted" },
  ],
};

/** Emits `:root` CSS with agency branding overlaid on the semantic layer. */
export function buildStarterTokenCss(branding?: Branding): BuildTokenCssResult {
  return buildTokenCss(starterTokens, branding);
}