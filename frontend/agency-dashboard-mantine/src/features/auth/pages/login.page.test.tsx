import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@test-utils';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test } from 'vitest';
import { DEFAULT_THEME } from '@mantine/core';
// Side effect: the page renders `LoginForm`, whose copy resolves through the
// common catalog, so the suite has to boot i18n the way the app does.
import i18n, { setLocale } from '../../../i18n/index.ts';
import { LoginPage } from './login.page.tsx';

/**
 * Contract for the split-screen login card.
 *
 * These assert the decisions that are easy to reverse by accident and invisible
 * until someone looks: which panel owns the `h1`, that no sentence is printed
 * twice, that the photograph is a *background* rather than an `<img>`, that the
 * panel is dropped below `md` instead of stacked, and that no physical-direction
 * CSS creeps in and freezes the Arabic page in an LTR arrangement.
 *
 * jsdom resolves the mobile-first base cascade but not media queries, so the
 * `md` half is asserted against the generated stylesheet text and the base half
 * against the computed style. Nothing here reaches the network or the router.
 */

/** The panel that carries the photo, addressed by the hook the component exposes. */
const HERO = '[data-login-hero]';
/** The breakpoint the layout switches at — Mantine's, not a magic number. */
const MD = DEFAULT_THEME.breakpoints.md;
/** The sign-in never stretches past a comfortable reading measure. */
const FORM_MEASURE_PX = 390;
/** The card is sized for a sign-in, not for a form page. */
const CARD_MEASURE_PX = 1080;
const CARD_MIN_HEIGHT_PX = 640;
/**
 * The wash over the photograph. A photograph hidden behind a scrim is a dark
 * rectangle; this is the ceiling that keeps the image the point of the panel
 * while the copy still clears AA. Recorded as a number so "lighten the wash"
 * cannot quietly become "remove the photo".
 */
const HERO_WASH_CEILING = 0.4;

/** A declaration that hard-codes a side, and so cannot mirror. */
const PHYSICAL_DIRECTION =
  /(^|[;"\s])(margin-left|margin-right|padding-left|padding-right|border-left|border-right|border-top|border-bottom|left|right|float)\s*:|text-align\s*:\s*(left|right)/;

/** A painted height, as opposed to Mantine's `--*-height` custom properties. */
const PAINTED_HEIGHT = /(^|[;"\s])(min-)?height\s*:/;

function renderPage() {
  // `LoginForm` reaches react-query for the mutation and the router for the
  // post-login redirect, so the page only renders inside both providers.
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function useLocale(locale: 'en' | 'ar') {
  await act(async () => {
    setLocale(locale);
  });
}

afterEach(async () => {
  await useLocale('en');
});

/** The subset of the CSSOM that jsdom exposes, kept structural on purpose. */
interface StyleRule {
  cssText: string;
  cssRules?: CSSRuleList;
  conditionText?: string;
  selectorText?: string;
}

/**
 * Every rule that targets `element`, with the media condition it sits under —
 * `''` meaning unconditional. Mantine hashes the style props into one class per
 * element, so a class match cannot drift onto a sibling.
 */
function rulesFor(element: Element): { query: string; cssText: string }[] {
  const selectors = [...element.classList].map((name) => `.${name}`);
  const found: { query: string; cssText: string }[] = [];

  const visit = (rules: CSSRuleList, query: string) => {
    for (const rule of Array.from(rules) as unknown as StyleRule[]) {
      // A style rule is a leaf; a grouping rule (`@media`) carries the condition.
      // jsdom exposes `cssRules` on style rules too, so the two cannot be told
      // apart by that key alone.
      if (rule.selectorText) {
        if (selectors.some((s) => rule.selectorText?.includes(s))) {
          found.push({ query, cssText: rule.cssText });
        }
      } else if (rule.cssRules) {
        visit(rule.cssRules, rule.conditionText ?? query);
      }
    }
  };

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      visit(sheet.cssRules, '');
    } catch {
      // A sheet the environment refuses to parse cannot hold a rule under test.
    }
  }

  return found;
}

/**
 * A CSS length in px. Mantine serialises every dimension prop as
 * `calc(<n>rem * var(--mantine-scale))`, so accepting a plain `px` too keeps the
 * assertions about the measure rather than about the unit Mantine happens to emit.
 */
function lengthPx(value: string): number | null {
  const trimmed = value.trim();
  const rem = /^calc\(([\d.]+)rem/.exec(trimmed);
  if (rem) {
    return Number(rem[1]) * 16;
  }
  return trimmed.endsWith('px') ? Number.parseFloat(trimmed) : null;
}

function maxWidthPx(element: Element): number | null {
  return lengthPx(getComputedStyle(element).maxWidth);
}

/**
 * A property's value as it applies from `md` up, read off the generated
 * stylesheet because jsdom does not evaluate media queries.
 */
function mdLength(row: Element, property: string): number | null {
  for (const rule of rulesFor(row)) {
    if (!rule.query.includes(MD)) {
      continue;
    }
    const match = new RegExp(`${property}:\\s*([^;}]+)`).exec(rule.cssText);
    if (match) {
      const value = lengthPx(match[1]);
      if (value !== null) {
        return value;
      }
    }
  }
  return null;
}

/**
 * The card itself. Addressed by Mantine's own root class rather than by
 * `firstElementChild`, which is whichever wrapper the test providers interpose.
 */
function cardFor(container: HTMLElement): HTMLElement {
  return container.querySelector<HTMLElement>('.mantine-Paper-root') as HTMLElement;
}

function styledElements(container: HTMLElement, selector = '*'): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(selector)];
}

describe('LoginPage', () => {
  test('gives the brand the only h1 and keeps the sign-in at h2', async () => {
    renderPage();

    // `hidden` because the brand lives in the panel that `display: none`s below
    // `md`, which drops it from the accessibility tree at base widths.
    const h1 = await screen.findAllByRole('heading', { level: 1, hidden: true });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent('Travel Connect');
    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent('Welcome back');
  });

  test('starts the mobile outline at the sign-in, because the brand hides below md', async () => {
    renderPage();

    // The consequence of dropping the image panel below `md`, recorded so it is a
    // decision rather than a surprise: the page's only h1 leaves the tree with it,
    // so on a phone nothing announces "Travel Connect" and the outline opens at h2.
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeNull();
  });

  test.each(['en', 'ar'] as const)('prints the sign-in subtitle once in %s', async (locale) => {
    await useLocale(locale);
    const { container } = renderPage();

    // The two panels used to both restate the welcome, which read as a mistake
    // rather than a layout: the same sentence twice, once over a photograph.
    const subtitle = i18n.t('auth:login.subtitle');
    expect(screen.getAllByText(subtitle)).toHaveLength(1);
    expect(container.textContent?.split(subtitle)).toHaveLength(2);
  });

  test('paints the photograph as a background, never as an <img>', async () => {
    const { container } = renderPage();

    // A background is clipped by the card's own `overflow: hidden` and rounded
    // corners; an `<img>` would need its own object-fit rules to match them.
    expect(container.querySelector('img')).toBeNull();

    const hero = container.querySelector<HTMLElement>(HERO);
    expect(hero).not.toBeNull();
    expect(hero?.style.backgroundImage).toMatch(/login-hero/);
    // `cover` is what keeps the photo from distorting: the panel and the image
    // never share an aspect ratio, and the photo is the one that must not bend.
    expect(hero?.style.backgroundSize).toBe('cover');
    expect(hero?.style.backgroundRepeat).toBe('no-repeat');
    expect(hero?.style.backgroundPosition).toMatch(/^center/);
  });

  test('drops the image panel below md and splits the card from md up', async () => {
    const { container } = renderPage();
    const hero = container.querySelector<HTMLElement>(HERO) as HTMLElement;

    // Mobile-first: the base declaration hides the panel unconditionally. A photo
    // above a form pushes the fields under the fold on a phone, which is the one
    // thing a sign-in page cannot afford — and it costs no phone the download.
    expect(getComputedStyle(hero).display).toBe('none');

    const fromMd = rulesFor(hero)
      .filter((rule) => rule.query.includes(MD))
      .map((rule) => rule.cssText)
      .join(' ');
    expect(fromMd).toMatch(/display:\s*flex/);
    expect(fromMd).toMatch(/width:\s*48%/);
  });

  test('sizes the card for a sign-in rather than a form page', () => {
    const { container } = renderPage();

    // The photo is 3:4 and the panel holds it, so the card grows with the image
    // instead of the image being letterboxed inside a fixed height.
    const card = cardFor(container);
    expect(maxWidthPx(card)).toBe(CARD_MEASURE_PX);

    // Below `md` the photo panel is gone, so the card must stop reserving its
    // height or the form floats in a band of empty paper.
    const row = container.querySelector<HTMLElement>(HERO)?.parentElement as HTMLElement;
    expect(getComputedStyle(row).minHeight).toBe('auto');
    expect(mdLength(row, 'min-height')).toBe(CARD_MIN_HEIGHT_PX);
  });

  test('states the three benefits under the photograph', () => {
    renderPage();

    // The copy that sells the agency, one row, so the panel says something
    // rather than merely showing a photograph.
    for (const label of ['Manage', 'Bookings', 'Grow', 'Customers', 'Increase', 'Your Sales']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  test('offers both languages from the card itself', async () => {
    renderPage();

    // The sidebar's locale menu is not reachable before sign-in, so the split
    // has to carry its own switch. `aria-pressed` is what tells a screen reader
    // which one is live, so its absence would leave the control silent.
    const en = screen.getByRole('button', { name: 'EN' });
    const ar = screen.getByRole('button', { name: 'عربي' });
    expect(en).toHaveAttribute('aria-pressed', 'true');
    expect(ar).toHaveAttribute('aria-pressed', 'false');
  });

  test('brands the phone above the form without duplicating the heading', () => {
    renderPage();

    // The panel that carries the `h1` is `display: none` below `md`, so the phone
    // needs the brand back — as text, not as a second heading. Counted so it
    // cannot quietly become three.
    const brand = screen.getAllByText('Travel Connect');
    expect(brand).toHaveLength(2);
    expect(brand.filter((node) => node.tagName === 'H1')).toHaveLength(1);
  });

  test('puts the primary action on the CTA token, not the workspace ink', () => {
    const { container } = renderPage();

    // `primaryColor` is `ink` for the product. Handing the button a theme colour
    // would make Mantine step `primaryShade` and land on `info[8]` — a navy so
    // close to ink that the one action meant to stand out reads as another
    // neutral. Naming the token keeps the fill and its contrast a decision.
    const submit = container.querySelector<HTMLElement>('button[type="submit"]');
    const style = submit?.getAttribute('style') ?? '';
    expect(style).toContain('--button-bg: var(--app-cta-fill)');
    expect(style).not.toContain('ink');
  });

  test('keeps remember-me and the recovery link on one row that mirrors', () => {
    const { container } = renderPage();

    // `space-between` on a flex row is the whole trick: under RTL the start and
    // end swap, so the checkbox and the link swap with them — no direction
    // branching, and the phone numbers layout survives both languages.
    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox).not.toBeNull();

    const row = checkbox?.closest('.mantine-Group-root') as HTMLElement | null;
    expect(row?.getAttribute('style')).toContain('--group-justify: space-between');
    expect(row?.getAttribute('style')).toContain('--group-wrap: nowrap');
    expect(row).toContainElement(screen.getByText('Forgot password?'));
  });

  test('washes the photo with the nav token so the image reads through', async () => {
    const { container } = renderPage();

    // The same near-black the navigation rail is painted with, at partial
    // opacity: white text then sits on the value it sits on everywhere else.
    const washes = styledElements(container).filter((element) =>
      (element.getAttribute('style') ?? '').includes('background-color: var(--app-surface-nav)')
    );
    expect(washes).toHaveLength(1);

    const opacity = Number(washes[0].style.opacity);
    expect(Number.isNaN(opacity)).toBe(false);
    // Opaque would be a block of colour, not a wash — the photo has to survive.
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
    // And light enough to still read as a photograph rather than as a tint.
    expect(opacity).toBeLessThanOrEqual(HERO_WASH_CEILING);
  });

  test('holds the sign-in to one readable column', async () => {
    const { container } = renderPage();

    const columns = styledElements(container).filter(
      (element) => maxWidthPx(element) === FORM_MEASURE_PX
    );
    expect(columns).toHaveLength(1);
    expect(columns[0]).toContainElement(screen.getByLabelText(/email/i));
    // Centred with a logical property, so the column mirrors under Arabic.
    expect(columns[0].style.marginInline).toBe('auto');
  });

  test('leaves control sizing to the token ramp', async () => {
    const { container } = renderPage();

    // A painted height on a control would opt it out of the app-wide ramp,
    // which is the whole point of that ramp.
    const paintedControls = styledElements(container, 'input, button, textarea, select')
      .filter((element) => PAINTED_HEIGHT.test(element.getAttribute('style') ?? ''))
      .map((element) => element.getAttribute('style'));
    expect(paintedControls).toEqual([]);

    // And on anything wrapping one: a fixed height on an ancestor crushes the
    // fields just as effectively as a fixed height on the field.
    const paintedAncestors: (string | null)[] = [];
    for (
      let element: HTMLElement | null = screen.getByLabelText(/email/i);
      element && element !== container;
      element = element.parentElement
    ) {
      if (PAINTED_HEIGHT.test(element.getAttribute('style') ?? '')) {
        paintedAncestors.push(element.getAttribute('style'));
      }
    }
    expect(paintedAncestors).toEqual([]);
  });

  test.each(['en', 'ar'] as const)('writes no physical-direction CSS in %s', async (locale) => {
    await useLocale(locale);
    const { container } = renderPage();

    const offenders = styledElements(container)
      .filter((element) => PHYSICAL_DIRECTION.test(element.getAttribute('style') ?? ''))
      .map((element) => `${element.tagName}: ${element.getAttribute('style')}`);
    expect(offenders).toEqual([]);
  });
});
