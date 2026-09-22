import {
  IconCalendarEvent,
  IconLayoutGrid,
  IconListCheck,
  IconMap2,
  IconTicket,
  IconUsers,
} from '@tabler/icons-react';
import { useAgencyContext } from '../../../features/agency-context/provider/agency-provider.tsx';
import { dashboardPaths } from '../../router/route-paths.ts';

export interface DashboardNavItem {
  labelKey: string;
  to: string;
  icon: typeof IconLayoutGrid;
}

interface NavDefinition extends Omit<DashboardNavItem, 'to'> {
  to: (code: string) => string;
  permission?: string;
}

const NAV_DEFINITIONS: readonly NavDefinition[] = [
  { labelKey: 'nav.overview', to: dashboardPaths.overview, icon: IconLayoutGrid },
  {
    labelKey: 'nav.trips',
    to: dashboardPaths.trips,
    icon: IconMap2,
    permission: 'AGENCY_TOUR_VIEW',
  },
  {
    labelKey: 'nav.departures',
    to: dashboardPaths.departures,
    icon: IconCalendarEvent,
    permission: 'AGENCY_DEPARTURE_VIEW',
  },
  {
    labelKey: 'nav.bookings',
    to: dashboardPaths.bookings,
    icon: IconTicket,
    permission: 'AGENCY_BOOKING_VIEW',
  },
  {
    labelKey: 'nav.customers',
    to: dashboardPaths.customers,
    icon: IconUsers,
    permission: 'AGENCY_CUSTOMER_VIEW',
  },
  {
    labelKey: 'nav.team',
    to: dashboardPaths.members,
    icon: IconListCheck,
    permission: 'AGENCY_MEMBER_VIEW',
  },
];

/** Sidebar links the current member may actually open, in sidebar order. */
export function useNavItems(): DashboardNavItem[] {
  const { code, can } = useAgencyContext();
  return NAV_DEFINITIONS.filter((item) => !item.permission || can(item.permission)).map((item) => ({
    labelKey: item.labelKey,
    to: item.to(code),
    icon: item.icon,
  }));
}
