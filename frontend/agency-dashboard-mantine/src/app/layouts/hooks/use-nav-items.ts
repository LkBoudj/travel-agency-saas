import {
  IconCalendarEvent,
  IconLayoutGrid,
  IconListCheck,
  IconMap2,
  IconPalette,
  IconTicket,
  IconUsers,
  IconWorld,
} from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import { useAgencyContext } from '../../../features/agency-context/provider/agency-provider.tsx';
import { dashboardPaths } from '../../router/route-paths.ts';

export interface DashboardNavItem {
  labelKey: string;
  to: string;
  icon: typeof IconLayoutGrid;
}

export interface DashboardNavGroup {
  /** Translation key for the section label, in `nav.groups.*`. */
  labelKey: string;
  items: DashboardNavItem[];
}

interface NavDefinition extends Omit<DashboardNavItem, 'to'> {
  to: (code: string) => string;
  permission?: string;
}

/**
 * The sidebar's shape. Grouping is what makes eight destinations scannable: a
 * flat list forces the eye to read every label to find one, and the order below
 * is the order a travel agency works in — what am I doing now, what is coming
 * up, who is on the team, what does the public see.
 */
const NAV_GROUPS: readonly { labelKey: string; items: readonly NavDefinition[] }[] = [
  {
    labelKey: 'nav.groups.workspace',
    items: [{ labelKey: 'nav.overview', to: dashboardPaths.overview, icon: IconLayoutGrid }],
  },
  {
    labelKey: 'nav.groups.operations',
    items: [
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
    ],
  },
  {
    labelKey: 'nav.groups.team',
    items: [
      {
        labelKey: 'nav.team',
        to: dashboardPaths.members,
        icon: IconListCheck,
        permission: 'AGENCY_MEMBER_VIEW',
      },
    ],
  },
  {
    labelKey: 'nav.groups.presence',
    items: [
      {
        labelKey: 'nav.website',
        to: dashboardPaths.website,
        icon: IconWorld,
        permission: 'AGENCY_WEBSITE_VIEW',
      },
      {
        labelKey: 'nav.themes',
        to: dashboardPaths.themes,
        icon: IconPalette,
        permission: 'AGENCY_WEBSITE_VIEW',
      },
    ],
  },
];

/**
 * The links the current member may actually open, grouped, with empty sections
 * dropped rather than left as a bare label — a heading with nothing under it
 * reads as a mistake.
 */
export function useNavGroups(): DashboardNavGroup[] {
  const { code, can } = useAgencyContext();

  return NAV_GROUPS.map((group) => ({
    labelKey: group.labelKey,
    items: group.items
      .filter((item) => !item.permission || can(item.permission))
      .map((item) => ({ labelKey: item.labelKey, to: item.to(code), icon: item.icon })),
  })).filter((group) => group.items.length > 0);
}

export interface ActiveNavLocation {
  groupLabelKey: string;
  itemLabelKey: string;
}

/**
 * Which nav entry the current route belongs to, for the header breadcrumb.
 *
 * Matched longest-prefix first so a detail route resolves to its own section
 * (`/bookings/BKG-…` → Bookings) and never to a shorter sibling that happens to
 * share a prefix. Built from the same `useNavGroups()` output the sidebar renders,
 * so the breadcrumb cannot name a section the member is not allowed to open.
 *
 * Returns `null` for a route outside the nav — a login page, an agency switcher,
 * an unknown URL — so the caller can render nothing rather than a dangling crumb.
 */
export function useActiveNavLocation(): ActiveNavLocation | null {
  const { pathname } = useLocation();
  const groups = useNavGroups();

  const match = groups
    .flatMap((group) => group.items.map((item) => ({ group, item })))
    .filter(({ item }) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.item.to.length - a.item.to.length)[0];

  if (!match) {
    return null;
  }
  return { groupLabelKey: match.group.labelKey, itemLabelKey: match.item.labelKey };
}
