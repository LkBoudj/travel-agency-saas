import {
  IconChartBar,
  IconCompass,
  IconCreditCard,
  IconHelpCircle,
  IconLayoutGrid,
  IconPlaneDeparture,
  IconSettings,
  IconTicket,
  IconUsers,
  IconUsersGroup,
  IconWorld,
} from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import { useAgencyContext } from '../../../features/agency-context/provider/agency-provider.tsx';
import { dashboardPaths } from '../../router/route-paths.ts';

export interface DashboardNavItem {
  labelKey: string;
  to: string;
  icon: typeof IconLayoutGrid;
  children?: {
    labelKey: string;
    to: string;
  }[];
}

export interface DashboardNavGroup {
  labelKey: string;
  items: DashboardNavItem[];
}

interface NavDefinition extends Omit<DashboardNavItem, 'to' | 'children'> {
  to: (code: string) => string;
  permission?: string;
  children?: {
    labelKey: string;
    to: (code: string) => string;
    permission?: string;
  }[];
}

export const MAIN_NAV_ITEMS: readonly NavDefinition[] = [
  { labelKey: 'nav.overview', to: dashboardPaths.overview, icon: IconLayoutGrid },
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
    labelKey: 'nav.tours',
    to: dashboardPaths.trips,
    icon: IconCompass,
    permission: 'AGENCY_TOUR_VIEW',
  },
  {
    labelKey: 'nav.departures',
    to: dashboardPaths.departures,
    icon: IconPlaneDeparture,
    permission: 'AGENCY_DEPARTURE_VIEW',
  },
  {
    labelKey: 'nav.payments',
    to: dashboardPaths.payments,
    icon: IconCreditCard,
    permission: 'AGENCY_PAYMENT_VIEW',
  },
  {
    labelKey: 'nav.website',
    to: dashboardPaths.themes,
    icon: IconWorld,
    permission: 'AGENCY_WEBSITE_VIEW',
    children: [
      {
        labelKey: 'nav.themes',
        to: dashboardPaths.themes,
        permission: 'AGENCY_WEBSITE_VIEW',
      },
      {
        labelKey: 'nav.pages',
        to: dashboardPaths.pages,
        permission: 'AGENCY_WEBSITE_VIEW',
      },
      {
        labelKey: 'nav.menu',
        to: dashboardPaths.menu,
        permission: 'AGENCY_WEBSITE_VIEW',
      },
      {
        labelKey: 'nav.settings',
        to: dashboardPaths.website,
        permission: 'AGENCY_WEBSITE_VIEW',
      },
    ],
  },
  {
    labelKey: 'nav.team',
    to: dashboardPaths.members,
    icon: IconUsersGroup,
    permission: 'AGENCY_MEMBER_VIEW',
  },
  {
    labelKey: 'nav.reports',
    to: (code: string) => `/${code}/reports`,
    icon: IconChartBar,
  },
];

export const BOTTOM_NAV_ITEMS: readonly NavDefinition[] = [
  {
    labelKey: 'nav.settings',
    to: dashboardPaths.website,
    icon: IconSettings,
    permission: 'AGENCY_WEBSITE_VIEW',
  },
  {
    labelKey: 'nav.help',
    to: (code: string) => `/${code}/help`,
    icon: IconHelpCircle,
  },
];

export function useNavItems(): DashboardNavItem[] {
  const { code, can } = useAgencyContext();

  return MAIN_NAV_ITEMS.filter((item) => !item.permission || can(item.permission)).map((item) => ({
    labelKey: item.labelKey,
    to: item.to(code),
    icon: item.icon,
    children: item.children
      ?.filter((child) => !child.permission || can(child.permission))
      .map((child) => ({
        labelKey: child.labelKey,
        to: child.to(code),
      })),
  }));
}

export function useBottomNavItems(): DashboardNavItem[] {
  const { code, can } = useAgencyContext();

  return BOTTOM_NAV_ITEMS.filter((item) => !item.permission || can(item.permission)).map(
    (item) => ({ labelKey: item.labelKey, to: item.to(code), icon: item.icon })
  );
}

export function useNavGroups(): DashboardNavGroup[] {
  const items = useNavItems();
  return [{ labelKey: 'nav.groups.workspace', items }];
}

export interface ActiveNavLocation {
  groupLabelKey: string;
  itemLabelKey: string;
}

export function useActiveNavLocation(): ActiveNavLocation | null {
  const { pathname } = useLocation();
  const allItems: { labelKey: string; to: string }[] = [];
  for (const item of [...useNavItems(), ...useBottomNavItems()]) {
    allItems.push({ labelKey: item.labelKey, to: item.to });
    if (item.children) {
      for (const child of item.children) {
        allItems.push({ labelKey: child.labelKey, to: child.to });
      }
    }
  }

  const match = allItems
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];

  if (!match) {
    return null;
  }
  return { groupLabelKey: 'nav.groups.workspace', itemLabelKey: match.labelKey };
}
