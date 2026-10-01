/**
 * Dashboard visual-regression driver.
 *
 * Captures the agency dashboard across pages, locales, widths, and shell states so
 * a redesign can be proven against a recorded baseline instead of memory. Reuses
 * the installed Playwright + cached Chromium that already live in this workspace;
 * adds no dependency to any package.json.
 *
 * Credentials come from the repo-root `.env` (WEBSITE_TEST_EMAIL /
 * WEBSITE_TEST_PASSWORD / WEBSITE_TEST_AGENCY_CODE) — the same account the website
 * integration test uses. Nothing is written to a file and no secret is logged.
 *
 * Usage:
 *   node tools/dashboard-screenshots.mjs --out <dir> [--only <page,page>]
 *
 * The login goes through the real form so the app's own auth path is exercised;
 * no token is injected and no endpoint is stubbed.
 */

import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '../..');
const DASHBOARD_ROOT = path.join(ROOT, 'agency-dashboard-mantine');

const BASE_URL = process.env.DASHBOARD_BASE_URL ?? 'http://localhost:5175';

/** `--out`/`--only` only; credentials are read from the environment, never argv. */
function parseArgs(argv) {
  const out = { out: '', only: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') out.out = argv[++i];
    else if (argv[i] === '--only') out.only = String(argv[++i] ?? '').split(',').filter(Boolean);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.out) {
  console.error('[dashboard:screens] --out <dir> is required');
  process.exit(1);
}
const OUT_DIR = path.isAbsolute(args.out) ? args.out : path.join(DASHBOARD_ROOT, args.out);

const AGENCY_CODE = process.env.WEBSITE_TEST_AGENCY_CODE;
const EMAIL = process.env.WEBSITE_TEST_EMAIL;
const PASSWORD = process.env.WEBSITE_TEST_PASSWORD;

if (!AGENCY_CODE || !EMAIL || !PASSWORD) {
  console.error(
    '[dashboard:screens] WEBSITE_TEST_EMAIL / WEBSITE_TEST_PASSWORD / WEBSITE_TEST_AGENCY_CODE are required\n' +
      '[dashboard:screens] source them from the repo-root .env before running',
  );
  process.exit(1);
}

const LOCALES = ['en', 'ar'];
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 768 },
  { name: '375', width: 375, height: 812 },
];
const PAGES = [
  { name: 'overview', path: `/${AGENCY_CODE}/overview` },
  { name: 'trips', path: `/${AGENCY_CODE}/trips` },
  { name: 'departures', path: `/${AGENCY_CODE}/departures` },
  { name: 'bookings', path: `/${AGENCY_CODE}/bookings` },
  { name: 'customers', path: `/${AGENCY_CODE}/customers` },
  { name: 'themes', path: `/${AGENCY_CODE}/themes` },
  { name: 'website', path: `/${AGENCY_CODE}/website` },
];
const targets = args.only.length > 0 ? PAGES.filter((p) => args.only.includes(p.name)) : PAGES;

/** Read the shell's own metrics so the baseline records geometry, not just pixels. */
async function readGeometry(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('.mantine-AppShell-navbar');
    const header = document.querySelector('.mantine-AppShell-header');
    const main = document.querySelector('.mantine-AppShell-main');
    const root = document.documentElement;
    const box = (el) => (el ? Math.round(el.getBoundingClientRect().width) : null);
    const style = (el, prop) => (el ? getComputedStyle(el)[prop] : null);
    return {
      sidebarWidth: box(nav),
      headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
      mainGutter: main ? getComputedStyle(main).paddingInlineStart : null,
      bodyBackground: style(document.body, 'backgroundColor'),
      bodyColor: style(document.body, 'color'),
      direction: root.getAttribute('dir') ?? getComputedStyle(root).direction,
      htmlFontSize: style(root, 'fontSize'),
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
    };
  });
}

async function login(context) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  // Mantine's `getInputProps` sets no `name` attribute, and Mantine leaves the
  // email input's `type` unset, so `input[name=…]`/`input[type="text"]` match
  // nothing. The `autocomplete` values the form itself declares are the stable
  // handles.
  await page
    .locator('form input[autocomplete="current-password"]')
    .first()
    .waitFor({ state: 'visible', timeout: 20_000 });
  await page.locator('form input[autocomplete="email"]').first().fill(EMAIL);
  await page.locator('form input[autocomplete="current-password"]').first().fill(PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
  await page.close();
  return true;
}

async function settle(page) {
  // One network-idle wait, then a paint: skeletons and in-flight queries are the
  // main reason a "before" shot differs from a "after" shot for no visual reason.
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(350);
}

async function main() {
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const failures = [];
  const geometry = {};
  let shots = 0;

  for (const locale of LOCALES) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await login(context);
    await context.addInitScript((lng) => {
      window.localStorage.setItem('travel-saas-locale', lng);
      window.localStorage.setItem('agency.activeCode', '');
    }, locale);
    await context.addInitScript((code) => {
      if (!window.localStorage.getItem('agency.activeCode')) {
        window.localStorage.setItem('agency.activeCode', code);
      }
    }, AGENCY_CODE);

    for (const viewport of VIEWPORTS) {
      const page = await context.newPage();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const target of targets) {
        const file = path.join(OUT_DIR, `${target.name}--${locale}--${viewport.name}.png`);
        try {
          await page.goto(`${BASE_URL}${target.path}`, { waitUntil: 'domcontentloaded' });
          await settle(page);
          await page.screenshot({ path: file, fullPage: true });
          shots += 1;
          if (viewport.name === '1440') {
            geometry[`${target.name}--${locale}`] = await readGeometry(page);
          }
        } catch (error) {
          failures.push(`${target.name}/${locale}/${viewport.name}: ${error.message}`);
        }
      }
      await page.close();
    }

    // Shell collapsed vs expanded at the widest viewport — the sidebar is the
    // single biggest visual change in this redesign, so it needs its own state.
    if (targets.some((t) => t.name === 'overview')) {
      const page = await context.newPage();
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE_URL}/${AGENCY_CODE}/overview`, { waitUntil: 'domcontentloaded' });
      await settle(page);
      const burger = page.locator('.mantine-Burger-root');
      if (await burger.isVisible().catch(() => false)) {
        await burger.click();
        await settle(page);
        await page.screenshot({ path: path.join(OUT_DIR, `shell--collapsed--${locale}--1440.png`), fullPage: false });
        shots += 1;
      } else {
        // No burger above `sm`: capture the narrow shell by shrinking instead.
        await page.setViewportSize({ width: 800, height: 900 });
        await settle(page);
        await page.screenshot({ path: path.join(OUT_DIR, `shell--collapsed--${locale}--1440.png`), fullPage: false });
        shots += 1;
      }
      await page.close();
    }

    await context.close();
  }

  await browser.close();

  const { writeFile } = await import('node:fs/promises');
  await writeFile(path.join(OUT_DIR, 'geometry.json'), `${JSON.stringify(geometry, null, 2)}\n`);

  console.log(`[dashboard:screens] wrote ${shots} screenshots to ${path.relative(ROOT, OUT_DIR)}`);
  if (failures.length > 0) {
    console.error(`[dashboard:screens] ${failures.length} capture(s) failed:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`[dashboard:screens] ${error.stack ?? error.message}`);
  process.exit(1);
});