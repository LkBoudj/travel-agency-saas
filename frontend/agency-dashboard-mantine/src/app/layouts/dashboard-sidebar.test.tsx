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

/** Section labels, in render order. Read off the group names: the "Team" label
    is also a link label, so a text query would match both. */
function sectionLabels() {
  return within(nav())
    .getAllByRole('group')
    .map((group) => group.getAttribute('aria-label'));
}

/** Section label → the links under it, in order. */
function sections() {
  return within(nav())
    .getAllByRole('group')
    .map((group) =>
      within(group)
        .getAllByRole('link')
        .map((link) => link.textContent)
    );
}

afterEach(async () => {
  await useLocale('en');
  can.mockImplementation(() => true);
});

describe('DashboardSidebar grouping', () => {
  test('groups the links under the four section labels', () => {
    renderSidebar();

    expect(navName()).toBe('Main navigation');
    expect(sectionLabels()).toEqual(['Workspace', 'Operations', 'Team', 'Online presence']);
    // Each label is a visible heading above its links, not just an aria-label.
    for (const label of ['Workspace', 'Operations', 'Online presence']) {
      expect(within(nav()).getByText(label)).toBeInTheDocument();
    }
  });

  test('shows the Arabic section labels for an Arabic session', async () => {
    renderSidebar();
    await useLocale('ar');

    expect(navName()).toBe('التنقل الرئيسي');
    expect(sectionLabels()).toEqual(['مساحة العمل', 'العمليات', 'الفريق', 'الحضور الإلكتروني']);
  });

  test('every link sits under the section that owns it', () => {
    renderSidebar();

    expect(sections()).toEqual([
      ['Overview'],
      ['Trips', 'Departures', 'Bookings', 'Customers'],
      ['Team'],
      ['Website', 'Themes'],
    ]);
  });

  test('drops a section entirely when the member cannot open anything in it', () => {
    can.mockImplementation((permission) => permission !== 'AGENCY_WEBSITE_VIEW');
    renderSidebar();

    expect(sections()).toEqual([
      ['Overview'],
      ['Trips', 'Departures', 'Bookings', 'Customers'],
      ['Team'],
    ]);
    expect(within(nav()).queryByText('Online presence')).not.toBeInTheDocument();
  });

  test('keeps the sections a member has partial access to', () => {
    can.mockImplementation(
      (permission) => permission === 'AGENCY_BOOKING_VIEW' || permission === 'AGENCY_MEMBER_VIEW'
    );
    renderSidebar();

    // Operations and Team each keep the one link the member may open; only the
    // fully empty section disappears.
    expect(sections()).toEqual([['Overview'], ['Bookings'], ['Team']]);
    expect(sectionLabels()).toEqual(['Workspace', 'Operations', 'Team']);
  });

  test('marks the active link on a section index route', () => {
    renderSidebar('/AGY-TEST/bookings');

    expect(within(nav()).getByRole('link', { name: 'Bookings' })).toHaveAttribute(
      'data-active',
      'true'
    );
    expect(within(nav()).getByRole('link', { name: 'Overview' })).not.toHaveAttribute(
      'data-active'
    );
  });

  test('keeps the parent section active on a detail route', () => {
    renderSidebar('/AGY-TEST/bookings/BKG-0C937B377B89');

    expect(within(nav()).getByRole('link', { name: 'Bookings' })).toHaveAttribute(
      'data-active',
      'true'
    );
  });

  test('an inactive sibling never looks active', () => {
    renderSidebar('/AGY-TEST/trips/TUR-0C937B377B89');

    expect(within(nav()).getByRole('link', { name: 'Trips' })).toHaveAttribute(
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
