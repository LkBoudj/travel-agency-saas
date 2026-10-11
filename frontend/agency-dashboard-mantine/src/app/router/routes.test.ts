import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Structural contract for the route table and the feature public APIs.
 *
 * Deliberately reads source text instead of importing the modules: `routes.tsx`
 * pulls in every routed page plus the StyleGuide showcase, and evaluating that
 * graph inside a jsdom worker starves the rest of the suite past its 5s timeout.
 */

const SRC = path.resolve(import.meta.dirname, '..', '..');
const FEATURES_DIR = path.join(SRC, 'features');
const ROUTES_FILE = path.join(SRC, 'app', 'router', 'routes.tsx');

/** Features whose pages the router mounts, and the symbols it needs from each. */
const ROUTED_FEATURES = {
  'agency-context': ['AgencyChooserPage'],
  auth: ['LoginPage'],
  bookings: ['BookingDetailsPage', 'BookingsPage'],
  customers: ['CustomersPage'],
  departures: ['DeparturesPage'],
  members: ['MembersPage'],
  overview: ['OverviewPage'],
  payments: ['PaymentsPage'],
  themes: ['ThemesPage'],
  trips: ['TripsEditorPage', 'TripsPage'],
  website: ['MenuPage', 'PagesPage', 'WebsitePage'],
} as const;

const PERMISSION_GATES = [
  ['members', 'AGENCY_MEMBER_VIEW'],
  ['customers', 'AGENCY_CUSTOMER_VIEW'],
  ['trips', 'AGENCY_TOUR_VIEW'],
  ['trips/:tourCode', 'AGENCY_TOUR_VIEW'],
  ['departures', 'AGENCY_DEPARTURE_VIEW'],
  ['bookings', 'AGENCY_BOOKING_VIEW'],
  ['bookings/:bookingCode', 'AGENCY_BOOKING_VIEW'],
  ['payments', 'AGENCY_PAYMENT_VIEW'],
  ['website', 'AGENCY_WEBSITE_VIEW'],
  ['themes', 'AGENCY_WEBSITE_VIEW'],
  ['pages', 'AGENCY_WEBSITE_VIEW'],
  ['menu', 'AGENCY_WEBSITE_VIEW'],
] as const;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return walk(full);
    }
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

/** True when `specifier`, imported from `fromFile`, resolves to `target`. */
function resolvesTo(specifier: string, fromFile: string, target: string): boolean {
  const base = specifier.startsWith('@/')
    ? path.join(SRC, specifier.slice(2))
    : specifier.startsWith('.')
      ? path.resolve(path.dirname(fromFile), specifier)
      : null;
  if (base === null) {
    return false;
  }
  return [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')].includes(target);
}

/** Route paths in document order, with the column that encodes nesting depth. */
function routePaths(source: string): [path: string, column: number][] {
  return source.split('\n').flatMap((line) => {
    const match = /^\s*(?:\{\s*)?path: '([^']+)',/.exec(line);
    return match ? [[match[1], line.indexOf('path:')] as [path: string, column: number]] : [];
  });
}

describe('route table location', () => {
  it('lives in app/router and the old root module is gone', () => {
    expect(existsSync(ROUTES_FILE)).toBe(true);
    expect(existsSync(path.join(SRC, 'Router.tsx'))).toBe(false);
  });

  it('mounts every route, nested exactly as before', () => {
    expect(routePaths(read(ROUTES_FILE))).toEqual([
      ['/login', 4],
      ['/', 8],
      ['/modes', 8],
      ['/:agencyCode', 8],
      ['overview', 16],
      ['members', 16],
      ['customers', 16],
      ['trips', 16],
      ['trips/:tourCode', 16],
      ['departures', 16],
      ['bookings', 16],
      ['bookings/:bookingCode', 16],
      ['payments', 16],
      ['website', 16],
      ['themes', 16],
      ['pages', 16],
      ['menu', 16],
      ['/styleguide', 10],
    ]);
  });

  it('keeps the index redirect into overview', () => {
    expect(read(ROUTES_FILE)).toContain(
      '{ index: true, element: <Navigate to="overview" replace /> }'
    );
  });

  it('keeps the guard and layout wrappers in order', () => {
    const source = read(ROUTES_FILE);
    const order = [
      '<GuestOnlyGuard>',
      '<AuthLayout>',
      '<LoginPage />',
      '<RequireAuth />',
      '<RootRedirect />',
      '<AgencyChooserPage />',
      '<RequireAgency />',
      '<DashboardLayout />',
      '<RequirePermission',
      '<StyleGuidePage />',
    ].map((token) => source.indexOf(token));

    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it.each(PERMISSION_GATES)('gates %s behind %s', (routePath, permission) => {
    const source = read(ROUTES_FILE);
    const block = source.slice(source.indexOf(`path: '${routePath}',`));

    expect(block.slice(0, block.indexOf('</RequirePermission>'))).toContain(
      `permissions={['${permission}']}`
    );
  });

  it('mounts the StyleGuide route only in DEV', () => {
    const source = read(ROUTES_FILE);
    const devRoute = source.slice(source.indexOf('import.meta.env.DEV'));

    expect(devRoute).toContain("path: '/styleguide'");
    expect(devRoute).toContain(': []');
  });
});

describe('feature public APIs', () => {
  it('has no global features barrel', () => {
    expect(existsSync(path.join(FEATURES_DIR, 'index.ts'))).toBe(false);
  });

  it.each(Object.entries(ROUTED_FEATURES))(
    '%s exposes exactly its routed pages',
    (feature, symbols) => {
      const index = path.join(FEATURES_DIR, feature, 'index.ts');
      expect(existsSync(index)).toBe(true);

      const exported = [...read(index).matchAll(/export\s*\{([^}]*)\}/g)]
        .flatMap((match) => match[1].split(','))
        .map((name) => name.trim())
        .filter(Boolean)
        .sort();

      expect(exported).toEqual([...symbols].sort());
    }
  );

  it.each(Object.keys(ROUTED_FEATURES))('%s re-exports only from pages/', (feature) => {
    for (const specifier of importSpecifiers(read(path.join(FEATURES_DIR, feature, 'index.ts')))) {
      expect(specifier).toMatch(/^\.\/pages\//);
    }
  });

  it.each(Object.keys(ROUTED_FEATURES))(
    '%s never imports itself through its own index',
    (feature) => {
      const dir = path.join(FEATURES_DIR, feature);
      const ownIndex = path.join(dir, 'index.ts');

      const offenders = walk(dir)
        .filter((file) => file !== ownIndex)
        .flatMap((file) =>
          importSpecifiers(read(file))
            .filter((specifier) => resolvesTo(specifier, file, ownIndex))
            .map((specifier) => `${path.relative(SRC, file)} → ${specifier}`)
        );

      expect(offenders).toEqual([]);
    }
  );
});

describe('router import boundary', () => {
  it('reaches feature pages only through each feature public API', () => {
    const specifiers = importSpecifiers(read(ROUTES_FILE));

    expect(specifiers.filter((specifier) => /features\/[^/]+\/pages\//.test(specifier))).toEqual(
      []
    );
    expect(specifiers.filter((specifier) => /features\/[^/]+\//.test(specifier)).sort()).toEqual(
      Object.keys(ROUTED_FEATURES)
        .map((feature) => `../../features/${feature}/index.ts`)
        .sort()
    );
  });

  it('keeps app-level imports direct', () => {
    expect(importSpecifiers(read(ROUTES_FILE))).toEqual(
      expect.arrayContaining([
        '../layouts/auth-layout.tsx',
        '../layouts/dashboard-layout.tsx',
        './guards/guest-only.tsx',
        './guards/require-agency.tsx',
        './guards/require-auth.tsx',
        './guards/require-permission.tsx',
        './guards/root-redirect.tsx',
        '../../pages/StyleGuide.page.tsx',
      ])
    );
  });

  it('is never imported from inside a feature', () => {
    const offenders = walk(FEATURES_DIR).flatMap((file) =>
      importSpecifiers(read(file))
        .filter((specifier) => resolvesTo(specifier, file, ROUTES_FILE))
        .map((specifier) => `${path.relative(SRC, file)} → ${specifier}`)
    );

    expect(offenders).toEqual([]);
  });
});
