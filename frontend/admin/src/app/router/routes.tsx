import { createBrowserRouter, Navigate } from "react-router-dom"

import { LoginPage } from "@/features/auth/pages/login-page"
import { OverviewPage } from "@/features/platform/pages/overview-page"
import { UsersPage } from "@/features/platform/pages/users-page"
import { RolesPermissionsPage } from "@/features/platform/pages/roles-permissions-page"
import { DashboardLayout } from "@/layouts/dashboard-layout"
import { ROUTES } from "./route-paths"
import { GuestOnly } from "./guards/guest-only"
import { RequireAuth } from "./guards/require-auth"

export function createAppRouter() {
  return createBrowserRouter([
    {
      element: <GuestOnly />,
      children: [
        {
          path: ROUTES.login,
          element: <LoginPage />,
        },
      ],
    },
    {
      element: <RequireAuth />,
      children: [
        {
          element: <DashboardLayout />,
          children: [
            { index: true, element: <Navigate to={ROUTES.overview} replace /> },
            { path: ROUTES.overview, element: <OverviewPage /> },
            {
              path: ROUTES.users,
              element: <Navigate to={ROUTES.platformUsers} replace />,
            },
            { path: ROUTES.platformUsers, element: <UsersPage /> },
            { path: ROUTES.rolesAndPermissions, element: <RolesPermissionsPage /> },
          ],
        },
      ],
    },
    {
      path: "*",
      element: <Navigate to="/" replace />,
    },
  ])
}