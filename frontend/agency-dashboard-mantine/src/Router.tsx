import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AuthLayout } from './app/layouts/auth-layout.tsx';
import { DashboardLayout } from './app/layouts/dashboard-layout.tsx';
import { GuestOnlyGuard } from './app/router/guards/guest-only.tsx';
import { RequireAgency } from './app/router/guards/require-agency.tsx';
import { RequireAuth } from './app/router/guards/require-auth.tsx';
import { RequirePermission } from './app/router/guards/require-permission.tsx';
import { RootRedirect } from './app/router/guards/root-redirect.tsx';
import { AgencyChooserPage } from './features/agency-context/pages/agency-chooser.page.tsx';
import { LoginPage } from './features/auth/pages/login-page.tsx';
import { BookingDetailsPage } from './features/bookings/pages/booking-details.page.tsx';
import { BookingsPage } from './features/bookings/pages/bookings.page.tsx';
import { CustomersPage } from './features/customers/pages/customers.page.tsx';
import { DeparturesPage } from './features/departures/pages/departures.page.tsx';
import { MembersPage } from './features/members/pages/members.page.tsx';
import { OverviewPage } from './features/overview/pages/overview.page.tsx';
import { ThemesPage } from './features/themes/pages/themes.page.tsx';
import { TripsEditorPage } from './features/trips/pages/trips-editor.page.tsx';
import { TripsPage } from './features/trips/pages/trips.page.tsx';
import { WebsitePage } from './features/website/pages/website.page.tsx';
import { StyleGuidePage } from './pages/StyleGuide.page';

const router = createBrowserRouter([
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
]);

export function Router() {
  return <RouterProvider router={router} />;
}
