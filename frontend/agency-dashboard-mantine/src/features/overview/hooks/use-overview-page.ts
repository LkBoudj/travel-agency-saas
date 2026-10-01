import { useTranslation } from 'react-i18next';
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
import { usePublishedWebsite, useWebsiteDraft } from '../../website/hooks/use-website.ts';
import {
  countActiveCustomers,
  countActiveMembers,
  countPublishedTours,
  recentBookings,
  tallyBookings,
} from '../lib/overview-stats.ts';

/** How many bookings the overview lists before deferring to the list page. */
const RECENT_BOOKINGS = 8;

export interface OverviewKpis {
  customers: number;
  tours: number;
  publishedTours: number;
  bookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  members: number;
}

/** A permission-gated, navigation-only shortcut for the page header. */
export interface OverviewQuickAction {
  key: string;
  label: string;
  run: () => void;
}

/** The public-site state the overview reports. Read-only; nothing mutates here. */
export interface OverviewSiteStatus {
  isLoading: boolean;
  isPublished: boolean;
  slug: string | null;
  themeId: string | null;
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
  /** Header shortcuts to the sections the member can open. Navigation only. */
  quickActions: OverviewQuickAction[];
  /** Public-site state for the status card. */
  site: OverviewSiteStatus;
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
 *
 * The hook composes; it renders nothing. Which shortcuts appear, which sections
 * exist and what they say are decided here so the page stays a layout.
 */
export function useOverviewPage(): OverviewPageController {
  const { t } = useTranslation('dashboard');
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

  // Same query keys as `useViewWebsite`, so this adds no request of its own.
  const siteDraftQuery = useWebsiteDraft(canViewWebsite);
  const sitePublishedQuery = usePublishedWebsite(canViewWebsite);

  const customers = customersQuery.data ?? [];
  const tours = toursQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const members = membersQuery.data ?? [];

  const tally = tallyBookings(bookings);

  const goToCustomers = () => navigate(dashboardPaths.customers(agencyCode));
  const goToTours = () => navigate(dashboardPaths.trips(agencyCode));
  const goToBookings = () => navigate(dashboardPaths.bookings(agencyCode));
  const goToMembers = () => navigate(dashboardPaths.members(agencyCode));

  // Navigation only: an overview shortcut takes the member to the list where the
  // real work happens. It never opens a create dialog on a page that has no
  // form to submit.
  const quickActions: OverviewQuickAction[] = [
    canViewBookings ? { key: 'bookings', label: t('actions.newBooking'), run: goToBookings } : null,
    canViewCustomers
      ? { key: 'customers', label: t('actions.addCustomer'), run: goToCustomers }
      : null,
    canViewTours ? { key: 'tours', label: t('actions.newTrip'), run: goToTours } : null,
    canViewMembers ? { key: 'members', label: t('actions.inviteMember'), run: goToMembers } : null,
  ].filter((action): action is OverviewQuickAction => action !== null);

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
    bookings: recentBookings(bookings, RECENT_BOOKINGS),
    quickActions,
    site: {
      isLoading: siteDraftQuery.isPending || sitePublishedQuery.isPending,
      isPublished: sitePublishedQuery.isSuccess,
      slug: siteDraftQuery.data?.slug ?? null,
      themeId: sitePublishedQuery.data?.themeId ?? siteDraftQuery.data?.themeId ?? null,
    },
    goToCustomers,
    goToTours,
    goToBookings,
    goToMembers,
    openBooking: (booking: AgencyBooking) =>
      navigate(dashboardPaths.bookingsDetail(agencyCode, booking.code)),
    viewWebsite: useViewWebsite(canViewWebsite),
  };
}
