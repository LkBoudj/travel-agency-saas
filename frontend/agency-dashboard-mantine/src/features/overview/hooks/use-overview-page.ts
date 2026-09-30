import { useNavigate } from 'react-router-dom';
import { dashboardPaths } from '../../../app/router/route-paths.ts';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import { useBookingCapabilities } from '../../bookings/hooks/use-booking-capabilities.ts';
import { useBookings } from '../../bookings/hooks/use-bookings.ts';
import type { AgencyBooking } from '../../bookings/types.ts';
import { useCustomerCapabilities } from '../../customers/hooks/use-customer-capabilities.ts';
import { useCustomers } from '../../customers/hooks/use-customers.ts';
import { useMemberCapabilities } from '../../members/hooks/use-member-capabilities.ts';
import { useAgencyMembers } from '../../members/hooks/use-members.ts';
import { useTripCapabilities } from '../../trips/hooks/use-tour-capabilities.ts';
import { useTours } from '../../trips/hooks/use-tours.ts';
import {
  useViewWebsite,
  type ViewWebsiteController,
} from '../../website/hooks/use-view-website.ts';
import { useWebsiteCapabilities } from '../../website/hooks/use-website-capabilities.ts';
import {
  countActiveCustomers,
  countActiveMembers,
  countPublishedTours,
  recentBookings,
  tallyBookings,
} from '../lib/overview-stats.ts';

export interface OverviewKpis {
  customers: number;
  tours: number;
  publishedTours: number;
  bookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  members: number;
}

export interface OverviewPageController {
  /** Whether each section is even visible to the member (permission-aware). */
  canView: {
    customers: boolean;
    tours: boolean;
    bookings: boolean;
    members: boolean;
    website: boolean;
  };
  /** Loading flag for the visible sections. */
  isLoading: boolean;
  isError: boolean;
  refetchVisible: () => void;
  kpis: OverviewKpis;
  bookings: AgencyBooking[];
  goToCustomers: () => void;
  goToTours: () => void;
  goToBookings: () => void;
  goToMembers: () => void;
  openBooking: (booking: AgencyBooking) => void;
  /** "View website" header action (absent without `AGENCY_WEBSITE_VIEW`). */
  viewWebsite: ViewWebsiteController;
}

/**
 * The Overview controller.
 *
 * Every KPI is derived from the feature's own list query — no new backend
 * call. Each query is gated by that feature's view permission, so a member
 * who cannot see customers never fires (or renders) that section. The recent
 * bookings slice is the newest-first list bounded client-side.
 */
export function useOverviewPage(): OverviewPageController {
  const navigate = useNavigate();
  const { code: agencyCode } = useAgencyContext();
  const customerCapabilities = useCustomerCapabilities();
  const tripCapabilities = useTripCapabilities();
  const bookingCapabilities = useBookingCapabilities();
  const memberCapabilities = useMemberCapabilities();
  const websiteCapabilities = useWebsiteCapabilities();

  const canViewCustomers = customerCapabilities.canView;
  const canViewTours = tripCapabilities.canView;
  const canViewBookings = bookingCapabilities.canView;
  const canViewMembers = memberCapabilities.canView;
  const canViewWebsite = websiteCapabilities.canView;

  const customersQuery = useCustomers('', canViewCustomers);
  const toursQuery = useTours('', undefined, canViewTours);
  const bookingsQuery = useBookings('', undefined, canViewBookings);
  const membersQuery = useAgencyMembers('', canViewMembers);

  const customers = customersQuery.data ?? [];
  const tours = toursQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const members = membersQuery.data ?? [];

  const tally = tallyBookings(bookings);

  return {
    canView: {
      customers: canViewCustomers,
      tours: canViewTours,
      bookings: canViewBookings,
      members: canViewMembers,
      website: canViewWebsite,
    },
    isLoading:
      customersQuery.isPending ||
      toursQuery.isPending ||
      bookingsQuery.isPending ||
      membersQuery.isPending,
    isError:
      (canViewCustomers && customersQuery.isError) ||
      (canViewTours && toursQuery.isError) ||
      (canViewBookings && bookingsQuery.isError) ||
      (canViewMembers && membersQuery.isError),
    refetchVisible: () => {
      void customersQuery.refetch();
      void toursQuery.refetch();
      void bookingsQuery.refetch();
      void membersQuery.refetch();
    },
    kpis: {
      customers: countActiveCustomers(customers),
      tours: tours.length,
      publishedTours: countPublishedTours(tours),
      bookings: bookings.length,
      pendingBookings: tally.PENDING,
      confirmedBookings: tally.CONFIRMED,
      members: countActiveMembers(members),
    },
    bookings: recentBookings(bookings, 5),
    goToCustomers: () => navigate(dashboardPaths.customers(agencyCode)),
    goToTours: () => navigate(dashboardPaths.trips(agencyCode)),
    goToBookings: () => navigate(dashboardPaths.bookings(agencyCode)),
    goToMembers: () => navigate(dashboardPaths.members(agencyCode)),
    openBooking: (booking: AgencyBooking) =>
      navigate(dashboardPaths.bookingsDetail(agencyCode, booking.code)),
    viewWebsite: useViewWebsite(canViewWebsite),
  };
}
