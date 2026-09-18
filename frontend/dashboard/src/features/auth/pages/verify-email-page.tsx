import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/app/router/route-paths"
import { AuthCard } from "@/features/auth/components/auth-card"
import { UnsupportedActionNotice } from "@/features/auth/components/unsupported-action-notice"
import { AuthHeader } from "@/features/auth/components/auth-header"

/**
 * Email verification screen.
 * Boundless by design: no resend or verification is faked — only clean
 * integration points for the future backend.
 */
export function VerifyEmailPage() {
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <AuthCard>
        <AuthHeader
          title={t("auth:verifyEmail.title")}
          description={t("auth:verifyEmail.description")}
        />

<UnsupportedActionNotice>
  Email verification is not part of sign-in yet. You can sign in with the credentials you were given.
</UnsupportedActionNotice>

        <div className="mt-6">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => {
              /* Boundary: wire the resend-verification-email mutation here. */
            }}
          >
            {t("auth:verifyEmail.resend")}
          </Button>
        </div>

        <div className="mt-4 text-center">
          <Link
            to={ROUTES.register}
            className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {t("auth:verifyEmail.changeEmail")}
          </Link>
        </div>
      </AuthCard>

      <Link
        to={ROUTES.login}
        className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        {t("auth:verifyEmail.backToSignIn")}
      </Link>
    </div>
  )
}