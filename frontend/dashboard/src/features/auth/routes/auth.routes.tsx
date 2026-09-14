import { Navigate, type RouteObject } from "react-router-dom"
import { GuestOnly } from "@/app/router/guards/guest-only"
import { ROUTES } from "@/app/router/route-paths"
import { ForgotPasswordPage } from "@/features/auth/pages/forgot-password-page"
import { CreateAgencyPage } from "@/features/auth/pages/create-agency-page"
import { LoginPage } from "@/features/auth/pages/login-page"
import { RegisterPage } from "@/features/auth/pages/register-page"
import { ResetPasswordPage } from "@/features/auth/pages/reset-password-page"
import { VerifyEmailPage } from "@/features/auth/pages/verify-email-page"
import { AuthLayout } from "@/layouts/auth-layout"

/**
 * Guest area routes, owned by the auth feature.
 * Adding or changing auth pages only requires editing this module.
 */
export const authRoutes: RouteObject[] = [
  {
    element: <GuestOnly />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { index: true, element: <Navigate to={ROUTES.login} replace /> },
          { path: ROUTES.login, element: <LoginPage /> },
          { path: ROUTES.register, element: <RegisterPage /> },
          { path: ROUTES.registerAgency, element: <CreateAgencyPage /> },
          { path: ROUTES.verifyEmail, element: <VerifyEmailPage /> },
          { path: ROUTES.forgotPassword, element: <ForgotPasswordPage /> },
          { path: ROUTES.resetPassword, element: <ResetPasswordPage /> },
        ],
      },
    ],
  },
]
