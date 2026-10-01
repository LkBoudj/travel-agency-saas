import { act, render, screen, within } from '@test-utils';
import { afterEach, describe, expect, test } from 'vitest';
import { setLocale } from '../../../i18n/index.ts';
import type { AgencyBooking } from '../../bookings/types.ts';
import type { OverviewPageController } from '../hooks/use-overview-page.ts';
import { OverviewView } from './overview-view.tsx';

async function useLocale(locale: 'en' | 'ar') {
  await act(async () => {
    setLocale(locale);
  });
}

afterEach(async () => {
  await useLocale('en');
});

function booking(index: number): AgencyBooking {
  return {
    code: `BKG-0C937B377B8${index}`,
    status: index % 2 === 0 ? 'CONFIRMED' : 'PENDING',
    customer: { code: `CUS-00000000000${index}`, firstName: `Amina${index}`, lastName: 'Belaid' },
    tour: { code: `TUR-00000000000${index}`, name: `Atlas ${index}` },
    departure: { code: `DEP-00000000000${index}`, startAt: '2026-03-04T09:00:00.000Z' },
    reservedSeats: 2,
    currency: 'DZD',
    totalAmount: 48000,
    notes: null,
  } as AgencyBooking;
}

/** Composition only: a controller literal proves the headings and actions. */
function controller(overrides: Partial<OverviewPageController> = {}) {
  return {
    kpis: {
      customers: 5,
      tours: 5,
      publishedTours: 5,
      bookings: 4,
      pendingBookings: 1,
      confirmedBookings: 3,
      members: 1,
    },
    canView: {
      customers: true,
      tours: true,
      bookings: true,
      members: true,
      website: true,
    },
    quickActions: [
      { key: 'bookings', label: 'New booking', run: () => {} },
      { key: 'customers', label: 'Add customer', run: () => {} },
    ],
    bookings: [],
    isLoading: false,
    isError: false,
    goToCustomers: () => {},
    goToTours: () => {},
    goToBookings: () => {},
    goToMembers: () => {},
    openBooking: () => {},
    refetchVisible: () => {},
    site: {
      isLoading: false,
      isPublished: false,
      slug: 'atlas-travel',
      themeId: 'safari',
    },
    viewWebsite: { mode: 'preview', open: () => {} } as OverviewPageController['viewWebsite'],
    ...overrides,
  } as unknown as OverviewPageController;
}

describe('OverviewView structure', () => {
  test('has one page heading and real section headings', () => {
    render(<OverviewView controller={controller()} />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    // Snapshot, recent bookings and site status are navigable sections.
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(2);
  });

  test('names the quick actions the member may use', () => {
    render(<OverviewView controller={controller()} />);

    expect(screen.getByRole('button', { name: 'New booking' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add customer' })).toBeInTheDocument();
  });

  test('renders no quick actions when the member has none', () => {
    render(<OverviewView controller={controller({ quickActions: [] })} />);

    expect(screen.queryByRole('button', { name: 'New booking' })).not.toBeInTheDocument();
  });

  test('offers a way into the whole bookings list from the recent section', () => {
    render(<OverviewView controller={controller()} />);

    // One in the section header, one in the empty listing — both lead to the
    // same list, which is the whole point of an empty state.
    expect(screen.getAllByRole('button', { name: 'Open Bookings' })).toHaveLength(2);
  });

  test('shows skeleton rows instead of a spinner while loading', () => {
    render(<OverviewView controller={controller({ isLoading: true })} />);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    // Placeholder rows, not zero rows: an empty table during load reads as "no data".
    expect(document.querySelectorAll('[data-skeleton]').length).toBeGreaterThan(0);
  });

  test('lists up to eight recent bookings and links out', () => {
    const bookings = Array.from({ length: 8 }, (_, index) => booking(index));
    render(<OverviewView controller={controller({ bookings })} />);

    for (const row of bookings) {
      expect(screen.getByText(row.code)).toBeInTheDocument();
    }
  });

  test('reports the site as published or not, without hiding the action', () => {
    render(
      <OverviewView
        controller={controller({
          site: { isLoading: false, isPublished: true, slug: 'atlas', themeId: null },
          viewWebsite: {
            mode: 'live',
            url: 'https://atlas.example',
            servesAnotherTenant: false,
            devTenantSlug: null,
            isOpening: false,
            open: () => {},
          },
        })}
      />
    );

    expect(screen.getByText('Published')).toBeInTheDocument();
    // Header and status card both offer it; neither pretends the site is live.
    expect(screen.getAllByRole('button', { name: /view live site/i }).length).toBeGreaterThan(0);
  });

  test('says the site is not published yet, and still offers a preview', () => {
    render(<OverviewView controller={controller()} />);

    expect(screen.getByText('Not published')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /preview draft/i }).length).toBeGreaterThan(0);
  });

  test('keeps the section labels translated', async () => {
    render(<OverviewView controller={controller()} />);
    expect(await screen.findByText('Recent bookings')).toBeInTheDocument();
    expect(screen.getByText('Site status')).toBeInTheDocument();

    await useLocale('ar');
    expect(await screen.findByText('أحدث الحجوزات')).toBeInTheDocument();
    expect(screen.getByText('حالة الموقع')).toBeInTheDocument();
  });

  test('omits the sections a member cannot see', () => {
    render(
      <OverviewView
        controller={controller({
          canView: {
            customers: false,
            tours: true,
            bookings: false,
            members: false,
            website: false,
          },
          quickActions: [],
          site: { isLoading: false, isPublished: false, slug: null, themeId: null },
        })}
      />
    );

    expect(screen.queryByText('Recent bookings')).not.toBeInTheDocument();
    expect(screen.queryByText('Site status')).not.toBeInTheDocument();
    expect(screen.getByText('Trips')).toBeInTheDocument();
  });

  test('surfaces a failing section with a retry', () => {
    render(<OverviewView controller={controller({ isError: true })} />);

    const alert = within(screen.getByRole('alert')).getByRole('button', { name: 'Retry' });
    expect(alert).toBeInTheDocument();
  });
});
