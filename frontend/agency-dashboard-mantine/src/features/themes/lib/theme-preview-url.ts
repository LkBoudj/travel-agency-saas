/**
 * Theme preview images ship in the theme registry manifest
 * (`previewImage: "/demo/themes/starter-home.jpg"`) and are **served by the theme
 * app** — the same origin that serves `/themes.json`. The dashboard has no
 * `public/` directory of its own, so a root-relative manifest path handed
 * straight to `<img src>` would resolve against the dashboard origin and 404
 * (the dev server would answer with `index.html` and the image would silently
 * be broken). Resolve it against the themes base URL instead.
 */

function stripTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * Absolute `http(s)` URLs pass through; relative and root-relative paths are
 * joined onto the themes base URL. A missing/blank image or base URL yields
 * `null` so the caller renders a placeholder instead of a broken image.
 */
export function themePreviewUrl(
  previewImage: string | undefined,
  themesBaseUrl: string | undefined
): string | null {
  if (typeof previewImage !== 'string') {
    return null;
  }

  const path = previewImage.trim();
  if (path === '') {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = typeof themesBaseUrl === 'string' ? stripTrailingSlashes(themesBaseUrl.trim()) : '';
  if (base === '') {
    return null;
  }

  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
