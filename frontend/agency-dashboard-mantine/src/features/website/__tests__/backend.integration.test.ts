import { beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * Live-backend smoke for the website clients (T8; the plan lists this file as
 * optional).
 *
 * The unit suites around this feature (`website-payloads.test.ts`,
 * `website-errors.test.ts`, `settings-map.test.ts`, `themes-manifest.test.ts`)
 * cover the pure logic. This file covers the *clients* against the running
 * NestJS API: real paths, real payloads, real status codes, real error
 * mapping — through the app's own `services/api.ts` transport, unmodified.
 *
 * It needs a real backend and a real database, so it is opt-in and skips
 * itself rather than faking a server:
 *
 *   VITE_API_BASE_URL=http://localhost:3000 \
 *   WEBSITE_TEST_EMAIL=… WEBSITE_TEST_PASSWORD=… WEBSITE_TEST_AGENCY_CODE=… \
 *   npm run vitest -- src/features/website/__tests__/backend.integration.test.ts
 *
 * It MUTATES the configured agency (it publishes it), so point it at a
 * throwaway agency.
 *
 * The theme registry manifest is asserted as well, but only when explicitly
 * asked for. `.env` ships `VITE_THEMES_BASE_URL=/themes` — a root-relative
 * path the Vite dev server proxies to theme-agency — which Node's `fetch`
 * cannot resolve, so the storefront suite is gated on its own opt-in and
 * requires the app env to hold the same absolute origin:
 *
 *   VITE_THEMES_BASE_URL=http://localhost:4321 \
 *   WEBSITE_TEST_THEMES_BASE_URL=http://localhost:4321 npm run vitest -- …
 */

const API_BASE_URL = process.env.VITE_API_BASE_URL?.trim();
const EMAIL = process.env.WEBSITE_TEST_EMAIL;
const PASSWORD = process.env.WEBSITE_TEST_PASSWORD;
const AGENCY_CODE = process.env.WEBSITE_TEST_AGENCY_CODE;
const THEMES_OPT_IN = process.env.WEBSITE_TEST_THEMES_BASE_URL?.trim();
const THEMES_APP_BASE = process.env.VITE_THEMES_BASE_URL?.trim();

const configured = Boolean(API_BASE_URL && EMAIL && PASSWORD && AGENCY_CODE);
const themesOptedIn = THEMES_OPT_IN !== undefined && THEMES_OPT_IN.length > 0;

/** Node's fetch keeps no cookie jar, so the session cookie travels explicitly. */
const nativeFetch = globalThis.fetch;
let sessionCookie = '';

function cookieFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  if (sessionCookie) {
    headers.set('cookie', sessionCookie);
  }
  return nativeFetch(input, { ...init, headers });
}

function rememberCookie(response: Response): void {
  const raw = response.headers.get('set-cookie');
  if (!raw) {
    return;
  }
  const pair = raw.split(';')[0];
  if (pair) {
    sessionCookie = sessionCookie ? `${sessionCookie}; ${pair}` : pair;
  }
}

// `getEnv()` caches `import.meta.env` on first call, so the env is read from
// the runner's environment only — nothing is patched in here.

describe.skipIf(!configured)('website clients against a live backend', () => {
  beforeAll(() => {
    vi.stubGlobal('fetch', cookieFetch);
  });

  it('signs in and reads the current user through the auth client', async () => {
    const { requestLogin, requestCurrentUser } = await import('../../auth/api/auth.api.ts');

    const raw = await cookieFetch(`${API_BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    rememberCookie(raw);
    expect(raw.status).toBe(200);
    expect(sessionCookie).not.toBe('');

    expect((await requestLogin(EMAIL!, PASSWORD!)).email).toBe(EMAIL);
    expect((await requestCurrentUser()).email).toBe(EMAIL);
  });

  it('reads the draft workspace and the published boundary', async () => {
    const { requestWebsiteDraft, requestPublishedWebsite } =
      await import('../../website/api/website.api.ts');

    const draft = await requestWebsiteDraft(AGENCY_CODE!);
    expect(draft.slug).toBe(AGENCY_CODE!.toLowerCase());
    expect(draft.locale).toBe('en');

    // A reused agency may already be published; both states are legitimate, but
    // a wrong one is not — and a missing published site must surface as a real
    // ApiError(404) instead of a silent default.
    const outcome = await requestPublishedWebsite(AGENCY_CODE!).then(
      (published) => ({ status: 200, slug: published.slug }),
      (error: unknown) => ({
        status: (error as { status?: number }).status,
        code: (error as { code?: string }).code,
      })
    );
    expect([
      { status: 200, slug: draft.slug },
      { status: 404, code: 'WEBSITE_NOT_PUBLISHED' },
    ]).toContainEqual(outcome);
  });

  it('edits content, sets the theme, publishes and mints a preview', async () => {
    const {
      requestPatchDraftContent,
      requestPatchDraftTheme,
      requestPublishWebsite,
      requestMintPreview,
      requestTourCatalog,
    } = await import('../../website/api/website.api.ts');
    // The API keeps `content` free-form; the feature's own mapper is how the UI
    // reads it, so assert through that instead of re-deriving the shape.
    const { websiteToFormValues } = await import('../lib/website-defaults.ts');

    const marker = `integration ${Date.now().toString(36)}`;
    const content = await requestPatchDraftContent(AGENCY_CODE!, {
      content: { hero: { title: marker } },
    });
    expect(websiteToFormValues(content).hero.title).toBe(marker);

    const theme = await requestPatchDraftTheme(AGENCY_CODE!, {
      themeId: 'starter',
      themeSettings: { 'homepage.showPromotion': false },
    });
    expect(theme.themeId).toBe('starter');

    const published = await requestPublishWebsite(AGENCY_CODE!);
    expect(typeof published.publishedAt).toBe('string');
    expect(websiteToFormValues(published).hero.title).toBe(marker);
    expect(published.themeId).toBe('starter');
    expect(published.themeSettings['homepage.showPromotion']).toBe(false);

    expect((await requestMintPreview(AGENCY_CODE!, 'home')).previewUrl).toContain(
      '/_lab/starter/home?t='
    );

    const catalog = await requestTourCatalog(AGENCY_CODE!);
    expect(catalog.length).toBeGreaterThan(0);
    expect(catalog.every((tour) => tour.code.startsWith('TUR-'))).toBe(true);
  });

  it('maps a body that smuggles theme keys to ApiError(400)', async () => {
    const { requestPatchDraftContent } = await import('../../website/api/website.api.ts');
    const { ApiError } = await import('../../../services/api.ts');

    await expect(
      requestPatchDraftContent(AGENCY_CODE!, {
        content: { hero: { title: 'smuggle' } },
        // The theme endpoint owns these keys; the content schema must refuse them.
        themeSettings: { 'homepage.showPromotion': true },
      } as never)
    ).rejects.toMatchObject({ status: 400 });
    expect(ApiError).toBeTypeOf('function');
  });

  it('maps an anonymous read to ApiError(401)', async () => {
    const { requestWebsiteDraft } = await import('../../website/api/website.api.ts');

    const saved = sessionCookie;
    sessionCookie = '';
    try {
      await expect(requestWebsiteDraft(AGENCY_CODE!)).rejects.toMatchObject({ status: 401 });
    } finally {
      sessionCookie = saved;
    }
  });
});

describe.skipIf(!themesOptedIn)('theme registry manifest from the live storefront', () => {
  it('fetches /themes.json through the themes client and parses the registry', async () => {
    const { requestThemesManifest } = await import('../../themes/api/themes-manifest.api.ts');

    // The client fetches `getEnv().themesBaseUrl`; a relative dev-proxy path is
    // browser-only, so a live run must have pointed the app at the real origin.
    expect(THEMES_APP_BASE).toBe(THEMES_OPT_IN);
    expect(THEMES_APP_BASE).toMatch(/^https?:\/\/[^/]+$/);

    const manifest = await requestThemesManifest();
    expect(manifest.themes.length).toBeGreaterThan(0);
    expect(manifest.themes.map((theme) => theme.themeId)).toContain('starter');

    for (const theme of manifest.themes) {
      expect(theme.themeId).toMatch(/^[a-z0-9][a-z0-9-]*$/);
      expect(theme.nameKey).not.toBe('');
      expect(theme.descriptionKey).not.toBe('');
      expect(theme.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(theme.settingsSchema.fields.length).toBeGreaterThan(0);
    }
  });
});
