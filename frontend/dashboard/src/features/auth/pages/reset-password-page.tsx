import { useTranslation } from "react-i18next"
import { AuthCard } from "@/features/auth/components/auth-card"
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

        <div className="mt-6">
          <ResetPasswordForm {...resetPassword} />
        </div>
      </AuthCard>
    </div>
  )
}