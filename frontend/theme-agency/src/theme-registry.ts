import type { ThemeDefinition } from "./sdk.ts";
import { starterTheme } from "../themes/starter/index.ts";

/**
 * App-level static theme registry. All themes ship in one bundle (D13); this
 * is the actual `Record<ThemeId, ThemeDefinition>` the render path uses —
 * `src/core/registry.ts` provides the generic helpers (default fallback etc.).
 * Adding a brand-new theme = add it here + redeploy the Worker.
 */
export const THEME_REGISTRY: Record<string, ThemeDefinition> = {
  [starterTheme.id]: starterTheme,
};

export function getRegisteredThemes(): ThemeDefinition[] {
  return Object.values(THEME_REGISTRY);
}