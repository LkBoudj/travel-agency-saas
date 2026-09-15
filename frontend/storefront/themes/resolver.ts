import type { AgencyStorefrontConfig } from "@/features/agency/types";
import { buildStorefrontContext } from "@/features/storefront/build-context";
import type { ThemeRenderContext } from "@/features/storefront/types";
import type { StorefrontTheme, ThemeSettings } from "./contracts";
import { DEFAULT_THEME_ID, isRegisteredThemeId, loadTheme } from "./registry";
import { resolveThemeSettings } from "./settings";

export interface ThemeIdResolution {
  themeId: string;
  usedDefaultTheme: boolean;
}

/**
 * Resolves the Agency's configured theme id against the registry.
 *
 * Any unknown, unregistered, or missing id falls back to the default Theme —
 * a public storefront must never hard-fail because of a bad theme id.
 */
export function resolveActiveThemeId(
  configuredThemeId: string | null | undefined,
): ThemeIdResolution {
  if (configuredThemeId && isRegisteredThemeId(configuredThemeId)) {
    return { themeId: configuredThemeId, usedDefaultTheme: false };
  }
  return { themeId: DEFAULT_THEME_ID, usedDefaultTheme: true };
}

export interface ActiveStorefront {
  themeId: string;
  theme: StorefrontTheme;
  settings: ThemeSettings;
  context: ThemeRenderContext;
  usedDefaultTheme: boolean;
}

/**
 * The single entry point every page/layout uses to obtain the active Theme.
 * Composes: id resolution → registry lookup → settings validation → context.
 */
export function getActiveStorefront(
  agency: AgencyStorefrontConfig,
): ActiveStorefront {
  const resolution = resolveActiveThemeId(agency.activeThemeId);
  const theme = loadTheme(resolution.themeId);
  const settings = resolveThemeSettings(theme, agency.settings);
  const context = buildStorefrontContext(agency);
  return {
    themeId: resolution.themeId,
    theme,
    settings,
    context,
    usedDefaultTheme: resolution.usedDefaultTheme,
  };
}