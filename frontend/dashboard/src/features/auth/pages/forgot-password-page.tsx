import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ROUTES } from "@/app/router/route-paths"
import { AuthCard } from "@/features/auth/components/auth-card"
import { UnsupportedActionNotice } from "@/features/auth/components/unsupported-action-notice"
import { AuthHeader } from "@/features/auth/components/auth-header"
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form"
import { useForgotPassword } from "@/features/auth/hooks/use-forgot-password"

export function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword()
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <AuthCard>
        <AuthHeader
          title={t("auth:forgotPassword.title")}
          description={t("auth:forgotPassword.description")}
        />

<UnsupportedActionNotice>
  Password recovery is not available yet. Ask an agency owner or the platform team to reset your access.
</UnsupportedActionNotice>

        <div className="mt-6">
          <ForgotPasswordForm {...forgotPassword} />
        </div>
      </AuthCard>

      <Link
        to={ROUTES.login}
        className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        {t("auth:forgotPassword.backToSignIn")}
      </Link>
    </div>
  )
}