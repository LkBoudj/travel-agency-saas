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
    customer: {
      code: `CUS-00000000000${index}`,
      firstName: `Amina${index}`,
      lastName: 'Belaid',
    },
    tour: { code: `TUR-00000000000${index}`, name: `Atlas ${index}` },
    departure: {
      code: `DEP-00000000000${index}`,
      startAt: '2026-03-04T09:00:00.000Z',
    },
    reservedSeats: 2,
    currency: 'DZD',
    totalAmount: 48000,
    notes: null,
  } as AgencyBooking;
}

const BASE_KPIS = {
  customers: 5,
  tours: 5,
  publishedTours: 5,
  bookings: 4,
  pendingBookings: 1,
  confirmedBookings: 3,
  members: 1,
};

/** Composition only: a controller literal proves the headings and actions. */
function controller(overrides: Partial<OverviewPageController> = {}) {
  return {
    kpis: BASE_KPIS,
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
      { key: 'tours', label: 'New trip', run: () => {} },
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
    viewWebsite: {
      mode: 'preview',
      open: () => {},
    } as OverviewPageController['viewWebsite'],
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
          site: {
            isLoading: false,
            isPublished: true,
            slug: 'atlas',
            themeId: null,
          },
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
          site: {
            isLoading: false,
            isPublished: false,
            slug: null,
            themeId: null,
          },
        })}
      />
    );

    expect(screen.queryByText('Recent bookings')).not.toBeInTheDocument();
    expect(screen.queryByText('Site status')).not.toBeInTheDocument();
    expect(screen.getByText('Trips')).toBeInTheDocument();
  });

  test('surfaces a failing section with a retry', () => {
    render(<OverviewView controller={controller({ isError: true })} />);

    const alert = within(screen.getByRole('alert')).getByRole('button', {
      name: 'Retry',
    });
    expect(alert).toBeInTheDocument();
  });
});

describe('OverviewView information design', () => {
  test('orders the tiles Customers, Trips, Bookings, Team', () => {
    render(<OverviewView controller={controller()} />);

    const labels = within(screen.getByTestId('kpi-tiles'))
      .getAllByRole('button')
      .map((tile) => (tile.textContent ?? '').split(/\d/)[0].trim());

    expect(labels).toEqual(['Customers', 'Trips', 'Bookings', 'Team']);
  });

  test('shows one tile per KPI the member may view', () => {
    render(
      <OverviewView
        controller={controller({
          canView: {
            customers: true,
            tours: true,
            bookings: false,
            members: false,
            website: false,
          },
          quickActions: [],
          site: {
            isLoading: false,
            isPublished: false,
            slug: null,
            themeId: null,
          },
        })}
      />
    );

    const tiles = within(screen.getByTestId('kpi-tiles')).getAllByRole('button');
    expect(tiles).toHaveLength(2);
  });

  test('gives a tile a 13px label above a 24px number, both semibold', () => {
    render(<OverviewView controller={controller({ kpis: { ...BASE_KPIS, customers: 12 } })} />);

    // The sizes are tokens; `tokens.test.ts` is what pins them to 13px and 24px.
    expect(screen.getByText('Customers')).toHaveStyle({
      fontSize: 'var(--app-tile-label-size)',
      fontWeight: '600',
    });
    expect(screen.getByText('12')).toHaveStyle({
      fontSize: 'var(--app-tile-value-size)',
      fontWeight: '600',
    });
  });

  test('keeps exactly one primary action in the page header', () => {
    render(<OverviewView controller={controller()} />);

    const actions = within(screen.getByTestId('page-actions')).getAllByRole('button');
    expect(actions).toHaveLength(1);
    expect(actions[0]).toHaveTextContent('New booking');
    // Mantine 9 expresses the variant as a custom property, not a class: the
    // primary is the one painting the near-black ink fill.
    expect(actions[0].getAttribute('style')).toContain('--mantine-color-ink-filled');
  });

  test('moves the remaining shortcuts below the header instead of crowding it', () => {
    render(<OverviewView controller={controller()} />);

    const shortcuts = within(screen.getByTestId('quick-actions')).getAllByRole('button');
    expect(shortcuts.map((button) => button.textContent)).toEqual(['Add customer', 'New trip']);
    // Only the promoted primary stays in the header; the rest are secondary.
    for (const shortcut of shortcuts) {
      expect(screen.getByTestId('page-actions')).not.toContainElement(shortcut);
    }
  });

  test('offers the site action once, from the site panel', () => {
    render(<OverviewView controller={controller()} />);

    const preview = screen.getAllByRole('button', { name: /preview draft/i });
    expect(preview).toHaveLength(1);
    expect(within(screen.getByTestId('site-status')).getByRole('button')).toBe(preview[0]);
  });
});
