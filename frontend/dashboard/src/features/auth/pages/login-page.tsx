import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ROUTES } from "@/app/router/route-paths"
import { AuthCard } from "@/features/auth/components/auth-card"
import { AuthHeader } from "@/features/auth/components/auth-header"
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button"
import { LoginForm } from "@/features/auth/components/login-form"
import { useLogin } from "@/features/auth/hooks/use-login"

export function LoginPage() {
  const login = useLogin()
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <AuthCard>
        <AuthHeader
          title={t("auth:login.title")}
          description={t("auth:login.description")}
        />

        <div className="mt-6 space-y-4">
          <GoogleAuthButton />

          <div
            role="separator"
            className="flex items-center gap-3 text-xs text-muted-foreground"
          >
            <div className="h-px flex-1 bg-border" />
            {t("auth:login.separator")}
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        <div className="mt-4">
          <LoginForm {...login} />
        </div>
      </AuthCard>

      <p className="text-sm text-muted-foreground">
        {t("auth:login.noAccount")}{" "}
        <Link
          to={ROUTES.register}
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
        >
          {t("auth:login.createOne")}
        </Link>
      </p>
    </div>
  )
}