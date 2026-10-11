import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router-dom';
import { AgencyChooserPage } from '../../features/agency-context/index.ts';
import { LoginPage } from '../../features/auth/index.ts';
import { BookingDetailsPage, BookingsPage } from '../../features/bookings/index.ts';
import { CustomersPage } from '../../features/customers/index.ts';
import { DeparturesPage } from '../../features/departures/index.ts';
import { MembersPage } from '../../features/members/index.ts';
import { OverviewPage } from '../../features/overview/index.ts';
import { PaymentsPage } from '../../features/payments/index.ts';
import { ThemesPage } from '../../features/themes/index.ts';
import { TripsEditorPage, TripsPage } from '../../features/trips/index.ts';
import { MenuPage, PagesPage, WebsitePage } from '../../features/website/index.ts';
import { StyleGuidePage } from '../../pages/StyleGuide.page.tsx';
import { AuthLayout } from '../layouts/auth-layout.tsx';
import { DashboardLayout } from '../layouts/dashboard-layout.tsx';
import { GuestOnlyGuard } from './guards/guest-only.tsx';
import { RequireAgency } from './guards/require-agency.tsx';
import { RequireAuth } from './guards/require-auth.tsx';
import { RequirePermission } from './guards/require-permission.tsx';
import { RootRedirect } from './guards/root-redirect.tsx';

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: (
      <GuestOnlyGuard>
        <AuthLayout>
          <LoginPage />
        </AuthLayout>
      </GuestOnlyGuard>
    ),
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/', element: <RootRedirect /> },
      { path: '/modes', element: <AgencyChooserPage /> },
      {
        path: '/:agencyCode',
        element: <RequireAgency />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { index: true, element: <Navigate to="overview" replace /> },
              { path: 'overview', element: <OverviewPage /> },
              {
                path: 'members',
                element: (
                  <RequirePermission permissions={['AGENCY_MEMBER_VIEW']}>
                    <MembersPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'customers',
                element: (
                  <RequirePermission permissions={['AGENCY_CUSTOMER_VIEW']}>
                    <CustomersPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'trips',
                element: (
                  <RequirePermission permissions={['AGENCY_TOUR_VIEW']}>
                    <TripsPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'trips/:tourCode',
                element: (
                  <RequirePermission permissions={['AGENCY_TOUR_VIEW']}>
                    <TripsEditorPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'departures',
                element: (
                  <RequirePermission permissions={['AGENCY_DEPARTURE_VIEW']}>
                    <DeparturesPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'bookings',
                element: (
                  <RequirePermission permissions={['AGENCY_BOOKING_VIEW']}>
                    <BookingsPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'bookings/:bookingCode',
                element: (
                  <RequirePermission permissions={['AGENCY_BOOKING_VIEW']}>
                    <BookingDetailsPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'payments',
                element: (
                  <RequirePermission permissions={['AGENCY_PAYMENT_VIEW']}>
                    <PaymentsPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'website',
                element: (
                  <RequirePermission permissions={['AGENCY_WEBSITE_VIEW']}>
                    <WebsitePage />
                  </RequirePermission>
                ),
              },
              {
                path: 'themes',
                element: (
                  <RequirePermission permissions={['AGENCY_WEBSITE_VIEW']}>
                    <ThemesPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'pages',
                element: (
                  <RequirePermission permissions={['AGENCY_WEBSITE_VIEW']}>
                    <PagesPage />
                  </RequirePermission>
                ),
              },
              {
                path: 'menu',
                element: (
                  <RequirePermission permissions={['AGENCY_WEBSITE_VIEW']}>
                    <MenuPage />
                  </RequirePermission>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
  ...(import.meta.env.DEV
    ? [
        {
          path: '/styleguide',
          element: <StyleGuidePage />,
        },
      ]
    : []),
];

const router = createBrowserRouter(routes);

export function Router() {
  return <RouterProvider router={router} />;
}
