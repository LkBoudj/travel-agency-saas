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
  tripsDetail: (agencyCode: string, tourCode: string) => `/${agencyCode}/trips/${tourCode}`,
  departures: (agencyCode: string) => `/${agencyCode}/departures`,
  bookings: (agencyCode: string) => `/${agencyCode}/bookings`,
  bookingsDetail: (agencyCode: string, bookingCode: string) =>
    `/${agencyCode}/bookings/${bookingCode}`,
} as const;

export type DashboardPathKey = keyof typeof dashboardPaths;
