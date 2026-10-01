import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@test-utils';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import '../../i18n/index.ts';
import { DashboardLayout } from './dashboard-layout.tsx';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, Outlet: () => <p>page content</p> };
});

// The rail footer is data-driven (logout mutation, agency context, locale). The
// shell has no opinion about any of that, so the layout specs stub it out.
vi.mock('../../features/agency-context/provider/agency-provider.tsx', () => ({
  useAgencyContext: () => ({ code: 'AGY-TEST', can: () => true }),
}));

vi.mock('./hooks/use-sidebar-footer.ts', () => ({
  useSidebarFooter: () => ({
    agencyName: 'Atlas Travel',
    agencyCode: 'AGY-TEST',
    membershipLabel: 'Owner',
    roles: [{ key: 'OWNER', name: 'Owner' }],
    locale: 'en',
    handleSetLocale: () => {},
    handleSignOut: () => {},
    handleSwitchAgency: () => {},
  }),
}));

const indexCss = readFileSync(path.resolve(import.meta.dirname, '../../index.css'), 'utf8');
const layoutSource = readFileSync(
  path.resolve(import.meta.dirname, 'dashboard-layout.tsx'),
  'utf8'
);
const tokensCss = readFileSync(path.resolve(import.meta.dirname, '../../theme/tokens.css'), 'utf8');

function renderLayout(path = '/AGY-TEST/overview') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DashboardLayout />
    </MemoryRouter>
  );
}

function rail() {
  return document.querySelector('.mantine-AppShell-navbar') as HTMLElement;
}

function header() {
  return document.querySelector('.mantine-AppShell-header') as HTMLElement;
}

describe('DashboardLayout', () => {
  test('offers a skip link as the first link a keyboard reaches', () => {
    renderLayout();

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAccessibleName(/skip to content/i);
    expect(links[0]).toHaveAttribute('href', '#main');
    expect(links[0]).toHaveClass('skip-link');
  });

  test('gives the skip link somewhere to land', () => {
    renderLayout();

    const main = document.querySelector('#main');
    expect(main?.tagName).toBe('MAIN');
    // Focusable so the fragment target can actually take focus.
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(within(main as HTMLElement).getByText('page content')).toBeInTheDocument();
  });

  test('the skip link hides off-screen and returns on focus, staying focusable', () => {
    // Off-screen, not `display: none` or `visibility: hidden` — either of those
    // would take it out of the tab order.
    expect(indexCss).toMatch(/\.skip-link\s*\{[^}]*position:\s*absolute/);
    expect(indexCss).toMatch(/\.skip-link\s*\{[^}]*inset-inline-start:\s*-9999px/);
    expect(indexCss).not.toMatch(/\.skip-link\s*\{[^}]*display:\s*none/);
    expect(indexCss).not.toMatch(/\.skip-link\s*\{[^}]*visibility:\s*hidden/);
    expect(indexCss).toMatch(/\.skip-link:focus-visible\s*\{[^}]*inset-inline-start:\s*var\(/);
  });
});

describe('DashboardLayout dark rail', () => {
  test('paints the rail with the nav surface rather than Mantine default white', () => {
    // The rail is the one dark surface in a light workspace, so it is painted by
    // an explicit rule keyed off a data attribute — not by AppShell's own
    // background, which would need a component-level `style` prop.
    expect(indexCss).toMatch(
      /\[data-shell-nav\][^{]*\{[^}]*background(?:-color)?:\s*var\(--app-surface-nav\)/
    );
    expect(indexCss).toMatch(/\[data-shell-nav\][^{]*\{[^}]*border-inline-end-color/);
  });

  test('marks the navbar so the rail rule can find it', () => {
    renderLayout();

    expect(rail()).toHaveAttribute('data-shell-nav');
  });

  test('the rail width comes from a token, narrower than the old fixed 260px', () => {
    expect(tokensCss).toMatch(/--app-rail-width:\s*220px/);

    // Asserted on the source rather than the DOM: jsdom does not resolve the
    // custom property, so the width only proves itself in a real browser. This
    // pins the contract the browser then satisfies.
    expect(layoutSource).toMatch(/width:\s*\{\s*base:\s*'var\(--app-rail-width\)'\s*\}/);
    expect(layoutSource).not.toMatch(/base:\s*260/);
  });
});

describe('DashboardLayout header band', () => {
  test('is the reference height, not the old 60px', () => {
    expect(tokensCss).toMatch(/--app-header-height:\s*44px/);
  });

  test('does not carry the agency identity, language, or account controls', () => {
    renderLayout();

    // All three moved to the rail footer: the spec asks for them to read as
    // secondary, and a 44px band cannot hold them without competing with the page.
    expect(within(header()).queryByText('Atlas Travel')).not.toBeInTheDocument();
    expect(within(header()).queryByRole('button', { name: /language/i })).not.toBeInTheDocument();
  });

  test('places the agency identity, language, and account controls in the rail', () => {
    renderLayout();

    expect(within(rail()).getByText('Atlas Travel')).toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: /language/i })).toBeInTheDocument();
    expect(within(rail()).getByRole('button', { name: /^account$/i })).toBeInTheDocument();
  });

  test('puts the account control after the navigation links, at the end of the rail', () => {
    renderLayout();

    const railChildren = [...rail().children];
    const accountIndex = railChildren.findIndex((child) =>
      child.textContent?.includes('Atlas Travel')
    );
    const navIndex = railChildren.findIndex((child) => child.tagName === 'NAV');

    expect(navIndex).toBeGreaterThanOrEqual(0);
    expect(accountIndex).toBeGreaterThan(navIndex);
  });

  test('orients the breadcrumb from the route, without a data fetch', () => {
    renderLayout('/AGY-TEST/bookings');

    // "Operations / Bookings" — the group, then the page. Reading the route is
    // navigation chrome, not a new query. Asserted through the breadcrumb's own
    // landmark rather than `textContent`, which also picks up Mantine's injected
    // responsive CSS text.
    const crumb = within(header()).getByRole('navigation', { name: /breadcrumb/i });
    expect(crumb.textContent).toContain('Operations');
    expect(crumb.textContent).toContain('Bookings');
  });

  test('the breadcrumb is not a second h1 — the page header owns the heading', () => {
    renderLayout('/AGY-TEST/bookings');

    expect(within(header()).queryByRole('heading')).not.toBeInTheDocument();
  });

  test('a route outside the nav shows no breadcrumb rather than a dangling one', () => {
    renderLayout('/AGY-TEST/this-does-not-exist');

    expect(within(header()).queryByRole('navigation', { name: /breadcrumb/i })).toBeNull();
  });
});
