export type WebsiteTabId = 'home' | 'tours' | 'navigation' | 'footer' | 'branding';

/** Top-level form path -> the tab that edits it (in tab order). */
const TAB_BY_PATH: ReadonlyArray<readonly [WebsiteTabId, readonly string[]]> = [
  ['home', ['hero', 'trustPoints', 'promotion', 'testimonials', 'finalCta', 'locale']],
  ['tours', ['featuredTourCodes']],
  ['navigation', ['navigation']],
  ['footer', ['footer']],
  ['branding', ['branding']],
];

/**
 * Which tab to reveal when a submit fails validation.
 *
 * Only the active tab is mounted, so an error on another tab is otherwise
 * invisible and the save looks like a no-op. Returns `null` when the error keys
 * are not form paths.
 */
export function firstWebsiteTabWithErrors(errors: Record<string, unknown>): WebsiteTabId | null {
  for (const [tab, paths] of TAB_BY_PATH) {
    if (paths.some((path) => path in errors)) {
      return tab;
    }
  }
  return null;
}
