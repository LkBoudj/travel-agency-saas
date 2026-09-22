export const routePaths = {
  login: '/login',
  modes: '/modes',
  root: '/',
} as const;

export const dashboardPaths = {
  overview: (agencyCode: string) => `/${agencyCode}/overview`,
  members: (agencyCode: string) => `/${agencyCode}/members`,
  customers: (agencyCode: string) => `/${agencyCode}/customers`,
  trips: (agencyCode: string) => `/${agencyCode}/trips`,
  departures: (agencyCode: string) => `/${agencyCode}/departures`,
  bookings: (agencyCode: string) => `/${agencyCode}/bookings`,
} as const;

export type DashboardPathKey = keyof typeof dashboardPaths;
