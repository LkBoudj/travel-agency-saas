import type {
  ThemeDefinition,
  ThemeSettings,
} from "./contracts.ts";
import {
  DEFAULT_THEME_ID,
  isRegisteredThemeId,
  loadTheme,
  THEME_REGISTRY,
} from "./registry.ts";
import { resolveThemeSettings } from "./settings-resolve.ts";

/**
 * Resolves the configuration's theme id against the registry with a safe
 * default fallback — a public storefront must never hard-fail on a bad id.
 * Anticipated: `{ slug }.platform.com` → tenant → storefront config (T5/T8).
 */

export interface ThemeResolutionInput {
  /** Configured theme id (e.g. from the storefront config / agency). */
  themeId?: string | null;
  /** Per-agency/per-preview settings overrides. */
  settings?: Record<string, unknown>;
}

export interface ThemeIdResolution {
  themeId: string;
  usedDefaultTheme: boolean;
}

export function resolveActiveThemeId(
  configuredThemeId: string | null | undefined,
  registry: Record<string, ThemeDefinition> = THEME_REGISTRY,
): ThemeIdResolution {
  if (configuredThemeId && isRegisteredThemeId(configuredThemeId, registry)) {
    return { themeId: configuredThemeId, usedDefaultTheme: false };
  }
  return { themeId: DEFAULT_THEME_ID, usedDefaultTheme: true };
}

export interface ActiveTheme {
  themeId: string;
  theme: ThemeDefinition | undefined;
  settings: ThemeSettings;
  usedDefaultTheme: boolean;
}

/**
 * Single entry point to obtain the active Theme.
 * Composes: id resolution → registry lookup → settings validation → defaults.
 */
export function getActiveTheme(
  input: ThemeResolutionInput,
  registry: Record<string, ThemeDefinition> = THEME_REGISTRY,
): ActiveTheme {
  const resolution = resolveActiveThemeId(input.themeId, registry);
  const theme = loadTheme(resolution.themeId, registry);
  const settings = theme
    ? resolveThemeSettings(theme, input.settings)
    : {};
  return {
    themeId: resolution.themeId,
    theme,
    settings,
    usedDefaultTheme: resolution.usedDefaultTheme,
  };
}