import { useTranslation } from "react-i18next"
import { AuthCard } from "@/features/auth/components/auth-card"
import { UnsupportedActionNotice } from "@/features/auth/components/unsupported-action-notice"
import { AuthHeader } from "@/features/auth/components/auth-header"
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form"
import { useResetPassword } from "@/features/auth/hooks/use-reset-password"

export function ResetPasswordPage() {
  const resetPassword = useResetPassword()
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <AuthCard>
        <AuthHeader
          title={t("auth:resetPassword.title")}
          description={t("auth:resetPassword.description")}
        />

<UnsupportedActionNotice>
  Password reset is not available yet. Ask an agency owner or the platform team for help.
</UnsupportedActionNotice>

        <div className="mt-6">
          <ResetPasswordForm {...resetPassword} />
        </div>
      </AuthCard>
    </div>
  )
}