/**
 * The Themes page has to keep two different truths apart:
 *
 * - **current** — the theme selected on the *draft* (`draft.themeId`). This is
 *   what the next publish will ship and what the Customize drawer edits.
 * - **live** — the theme the *published* site actually serves
 *   (`published.themeId`). It only changes when someone publishes.
 *
 * Between an Activate and the following Publish they differ, and that gap is
 * the whole reason this page exists — so the card state is computed here, in
 * pure functions, instead of being re-derived inside JSX.
 */

export type ThemePublishState = 'unpublished' | 'in-sync' | 'pending-publish';

export interface ThemeCardState {
  /** Selected on the draft — the theme being edited and the next to publish. */
  isCurrent: boolean;
  /** What the live site serves right now. */
  isLive: boolean;
  /** Selected on the draft but not yet live: publishing will change the site. */
  isPendingPublish: boolean;
}

/** Per-card state for one manifest entry. */
export function themeCardState(
  themeId: string,
  draftThemeId: string | null,
  publishedThemeId: string | null
): ThemeCardState {
  const isCurrent = draftThemeId !== null && draftThemeId === themeId;
  const isLive = publishedThemeId !== null && publishedThemeId === themeId;

  return { isCurrent, isLive, isPendingPublish: isCurrent && !isLive };
}

/**
 * Page-level state. `hasPublishedSite === false` means there is no live site at
 * all, so the first publish is not a *change* to an existing site — the header
 * must not claim a pending diff that nobody can see.
 */
export function themePublishState(
  draftThemeId: string | null,
  publishedThemeId: string | null,
  hasPublishedSite: boolean
): ThemePublishState {
  if (!hasPublishedSite) {
    return 'unpublished';
  }
  return draftThemeId === publishedThemeId ? 'in-sync' : 'pending-publish';
}

/** The live theme an agency is running, or `null` when nothing is published. */
export function liveThemeId(
  publishedThemeId: string | null | undefined,
  hasPublishedSite: boolean
): string | null {
  return hasPublishedSite ? (publishedThemeId ?? null) : null;
}
