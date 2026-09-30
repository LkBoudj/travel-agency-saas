/**
 * End-to-end fixtures for the Platform Test Target (T13) + future themes.
 *
 * These are the *test world's* ground truth: `theme:test <id>` filters the
 * suite by one of `THEME_IDS`, and the fallback spec proves an unregistered id
 * renders the default theme. Keep the ids in sync with `src/theme-registry.ts`
 * when shipping a new theme — the fallback spec is the safety net that keeps a
 * stale entry honest (a registered-but-absent theme fails its lab assertions).
 */
export const THEME_IDS = ["starter"];

/** The platform's safe default fallback theme. */
export const DEFAULT_THEME_ID = "starter";

export const TRIP_SLUG = "santorini-escape";
export const TRIP_TITLE = "Santorini Escape";
export const HERO_TITLE = "Discover your next journey";

/** Public `localhost` tenant slug used to sign lab preview tokens. */
export const TENANT_SLUG = "demo";