import { act, render, screen, within } from '@test-utils';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { setLocale } from '../../i18n/index.ts';
import { DashboardSidebar } from './dashboard-sidebar.tsx';

const can = vi.fn<(permission: string) => boolean>(() => true);

vi.mock('../../features/agency-context/provider/agency-provider.tsx', () => ({
  useAgencyContext: () => ({ code: 'AGY-TEST', can }),
}));

async function useLocale(locale: 'en' | 'ar') {
  await act(async () => {
    setLocale(locale);
  });
}

function renderSidebar(path = '/AGY-TEST/overview') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DashboardSidebar onNavigate={() => {}} />
    </MemoryRouter>
  );
}

function nav() {
  // Locale-agnostic on purpose: the nav landmark is renamed on `setLocale('ar')`.
  return screen.getByRole('navigation');
}

function navName() {
  return nav().getAttribute('aria-label');
}

afterEach(async () => {
  await useLocale('en');
  can.mockImplementation(() => true);
});

describe('DashboardSidebar navigation', () => {
  test('renders the navigation landmark with correct label', () => {
    renderSidebar();

    expect(navName()).toBe('Main navigation');
  });

  test('shows the Arabic nav landmark for an Arabic session', async () => {
    renderSidebar();
    await useLocale('ar');

    expect(navName()).toBe('التنقل الرئيسي');
  });

  test('renders the approved main navigation items in order', () => {
    renderSidebar();

    const links = within(nav())
      .getAllByRole('link')
      .map((link) => link.textContent?.trim());

    expect(links).toEqual([
      'Overview',
      'Bookings',
      'Customers',
      'Tours',
      'Departures',
      'Payments',
      'Team',
      'Reports',
    ]);
  });

  test('renders bottom navigation items (Settings, Help)', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Help' })).toBeInTheDocument();
  });

  test('filters out items the member cannot open', () => {
    can.mockImplementation((permission) => permission !== 'AGENCY_BOOKING_VIEW');
    renderSidebar();

    const links = within(nav())
      .getAllByRole('link')
      .map((link) => link.textContent?.trim());

    expect(links).not.toContain('Bookings');
    expect(links).not.toContain('Payments');
    expect(links).toContain('Overview');
    expect(links).toContain('Customers');
  });

  test('marks the active link on an index route', () => {
    renderSidebar('/AGY-TEST/bookings');

    expect(within(nav()).getByRole('link', { name: 'Bookings' })).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(within(nav()).getByRole('link', { name: 'Overview' })).not.toHaveAttribute(
      'data-active'
    );
  });

  test('keeps the parent link active on a detail route', () => {
    renderSidebar('/AGY-TEST/bookings/BKG-0C937B377B89');

    expect(within(nav()).getByRole('link', { name: 'Bookings' })).toHaveAttribute(
      'data-active',
      'true'
    );
  });

  test('an inactive sibling never looks active', () => {
    renderSidebar('/AGY-TEST/trips/TUR-0C937B377B89');

    expect(within(nav()).getByRole('link', { name: 'Tours' })).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(within(nav()).getByRole('link', { name: 'Bookings' })).not.toHaveAttribute(
      'data-active'
    );
  });

  test('points every link at this agency and nothing else', () => {
    renderSidebar();

    const hrefs = within(nav())
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs.every((href) => href?.startsWith('/AGY-TEST/'))).toBe(true);
  });
});
