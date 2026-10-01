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

// The header is data-driven (logout mutation, agency context, locale). The shell
// has no opinion about any of that, so the layout specs stub it out.
vi.mock('../../features/agency-context/provider/agency-provider.tsx', () => ({
  useAgencyContext: () => ({ code: 'AGY-TEST', can: () => true }),
}));

vi.mock('./hooks/use-dashboard-header.ts', () => ({
  useDashboardHeader: () => ({
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

function renderLayout() {
  return render(
    <MemoryRouter>
      <DashboardLayout />
    </MemoryRouter>
  );
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
    const css = readFileSync(path.resolve(import.meta.dirname, '../../index.css'), 'utf8');

    // Off-screen, not `display: none` or `visibility: hidden` — either of those
    // would take it out of the tab order.
    expect(css).toMatch(/\.skip-link\s*\{[^}]*position:\s*absolute/);
    expect(css).toMatch(/\.skip-link\s*\{[^}]*inset-inline-start:\s*-9999px/);
    expect(css).not.toMatch(/\.skip-link\s*\{[^}]*display:\s*none/);
    expect(css).not.toMatch(/\.skip-link\s*\{[^}]*visibility:\s*hidden/);
    expect(css).toMatch(/\.skip-link:focus-visible\s*\{[^}]*inset-inline-start:\s*var\(/);
  });
});
