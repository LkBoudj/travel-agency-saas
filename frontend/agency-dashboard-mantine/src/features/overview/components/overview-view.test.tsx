import { act, fireEvent, render, screen, within } from '@test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
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
      { key: 'bookings', label: 'New booking', run: vi.fn() },
      { key: 'customers', label: 'Add customer', run: vi.fn() },
      { key: 'tours', label: 'Create tour', run: vi.fn() },
    ],
    bookings: [],
    isLoading: false,
    isError: false,
    goToCustomers: vi.fn(),
    goToTours: vi.fn(),
    goToBookings: vi.fn(),
    goToMembers: vi.fn(),
    openBooking: vi.fn(),
    refetchVisible: vi.fn(),
    site: {
      isLoading: false,
      isPublished: false,
      slug: 'atlas-travel',
      themeId: 'safari',
    },
    viewWebsite: {
      mode: 'preview',
      open: vi.fn(),
    } as unknown as OverviewPageController['viewWebsite'],
    ...overrides,
  } as unknown as OverviewPageController;
}

describe('OverviewView structure', () => {
  test('has one page heading and real section headings', () => {
    render(<OverviewView controller={controller()} />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(4);
  });

  test('renders the greeting, date button, and primary action in the header', () => {
    render(<OverviewView controller={controller()} />);

    expect(screen.getByText('Good afternoon, Lakhdar')).toBeInTheDocument();
    expect(screen.getByText('Oct 8, 2026')).toBeInTheDocument();

    const pageActions = screen.getByTestId('page-actions');
    expect(within(pageActions).getByRole('button', { name: /new booking/i })).toBeInTheDocument();
  });

  test('names the quick actions in the quick actions section', () => {
    render(<OverviewView controller={controller()} />);

    const quickActionsEl = screen.getByTestId('quick-actions');
    expect(within(quickActionsEl).getByText('New booking')).toBeInTheDocument();
    expect(within(quickActionsEl).getByText('Add customer')).toBeInTheDocument();
    expect(within(quickActionsEl).getByText('Create tour')).toBeInTheDocument();
    expect(within(quickActionsEl).getByText('Add departure')).toBeInTheDocument();
    expect(within(quickActionsEl).getByText('Record payment')).toBeInTheDocument();
  });

  test('renders no quick actions card when member has no quick actions', () => {
    render(<OverviewView controller={controller({ quickActions: [] })} />);

    expect(screen.queryByTestId('quick-actions')).not.toBeInTheDocument();
  });

  test('clicking quick actions calls appropriate controller navigation', () => {
    const ctrl = controller();
    render(<OverviewView controller={ctrl} />);

    const quickActionsEl = screen.getByTestId('quick-actions');
    fireEvent.click(within(quickActionsEl).getByText('Add customer'));
    expect(ctrl.goToCustomers).toHaveBeenCalled();

    fireEvent.click(within(quickActionsEl).getByText('Create tour'));
    expect(ctrl.goToTours).toHaveBeenCalled();
  });

  test('offers a way into the whole bookings list from the recent section', () => {
    const ctrl = controller();
    render(<OverviewView controller={ctrl} />);

    const openBookings = screen.getByRole('button', { name: /open bookings/i });
    expect(openBookings).toBeInTheDocument();
    fireEvent.click(openBookings);
    expect(ctrl.goToBookings).toHaveBeenCalled();
  });

  test('shows skeleton rows instead of a spinner while loading', () => {
    render(<OverviewView controller={controller({ isLoading: true })} />);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-skeleton]').length).toBeGreaterThan(0);
  });

  test('lists up to eight recent bookings and links out', () => {
    const bookings = Array.from({ length: 8 }, (_, index) => booking(index));
    render(<OverviewView controller={controller({ bookings })} />);

    for (const row of bookings) {
      expect(screen.getByText(new RegExp(row.customer.firstName ?? ''))).toBeInTheDocument();
    }
  });

  test('status tabs allow filtering bookings', () => {
    const bookings = [
      { ...booking(0), status: 'CONFIRMED' as const },
      { ...booking(1), status: 'PENDING' as const },
    ];
    render(<OverviewView controller={controller({ bookings })} />);

    expect(screen.getByText('Amina0 Belaid')).toBeInTheDocument();
    expect(screen.getByText('Amina1 Belaid')).toBeInTheDocument();

    const confirmedTab = screen.getByText('Confirmed');
    fireEvent.click(confirmedTab);

    expect(screen.getByText('Amina0 Belaid')).toBeInTheDocument();
    expect(screen.queryByText('Amina1 Belaid')).not.toBeInTheDocument();
  });

  test('renders upcoming departures section with routes and dates', () => {
    render(<OverviewView controller={controller()} />);

    expect(screen.getByText('Algiers → Istanbul')).toBeInTheDocument();
    expect(screen.getByText('Algiers → Dubai')).toBeInTheDocument();
    expect(screen.getByText('Classic Italy')).toBeInTheDocument();
  });

  test('renders needs attention operational section with alert items', () => {
    render(<OverviewView controller={controller()} />);

    expect(screen.getByText('2 pending payments')).toBeInTheDocument();
    expect(screen.getByText('1 departure nearing capacity')).toBeInTheDocument();
    expect(screen.getByText('3 new customer requests')).toBeInTheDocument();
  });

  test('keeps the section labels translated', async () => {
    render(<OverviewView controller={controller()} />);
    expect(await screen.findByText('Recent Bookings')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Departures')).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();

    await useLocale('ar');
    expect(await screen.findByText('أحدث الحجوزات')).toBeInTheDocument();
    expect(screen.getByText('المغادرات القادمة')).toBeInTheDocument();
    expect(screen.getByText('يتطلب اهتمامك')).toBeInTheDocument();
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
        })}
      />
    );

    expect(screen.queryByText('Recent Bookings')).not.toBeInTheDocument();
    expect(screen.getByText('Upcoming Departures')).toBeInTheDocument();
  });

  test('surfaces a failing section with a retry', () => {
    const ctrl = controller({ isError: true });
    render(<OverviewView controller={ctrl} />);

    const alert = within(screen.getByRole('alert')).getByRole('button', {
      name: 'Retry',
    });
    expect(alert).toBeInTheDocument();
    fireEvent.click(alert);
    expect(ctrl.refetchVisible).toHaveBeenCalled();
  });
});

describe('OverviewView summary metrics', () => {
  test('orders the tiles Bookings, Customers, Departures, Revenue', () => {
    render(<OverviewView controller={controller()} />);

    const tileLabels = within(screen.getByTestId('kpi-tiles'))
      .getAllByRole('button')
      .map((tile) => tile.querySelector('.mantine-Text-root')?.textContent?.trim());

    expect(tileLabels).toEqual(['Bookings', 'Customers', 'Departures', 'Revenue']);
  });

  test('shows one tile per KPI the member may view', () => {
    render(
      <OverviewView
        controller={controller({
          canView: {
            customers: true,
            tours: false,
            bookings: false,
            members: false,
            website: false,
          },
          quickActions: [],
        })}
      />
    );

    const tiles = within(screen.getByTestId('kpi-tiles')).getAllByRole('button');
    expect(tiles).toHaveLength(1);
    expect(within(tiles[0]).getByText('Customers')).toBeInTheDocument();
  });

  test('displays trend comparison metadata', () => {
    render(<OverviewView controller={controller()} />);

    const tiles = screen.getByTestId('kpi-tiles');
    expect(within(tiles).getByText('12%')).toBeInTheDocument();
    expect(within(tiles).getAllByText('vs last month').length).toBe(4);
  });
});
