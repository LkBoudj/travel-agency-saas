import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { ROUTES } from "@/app/router/route-paths"
import { AuthCard } from "@/features/auth/components/auth-card"
import { AuthHeader } from "@/features/auth/components/auth-header"
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button"
import { RegisterForm } from "@/features/auth/components/register-form"
import { useRegister } from "@/features/auth/hooks/use-register"

export function RegisterPage() {
  const register = useRegister()
  const { t } = useTranslation()

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <AuthCard>
        <AuthHeader
          step={t("auth:register.step")}
          title={t("auth:register.title")}
          description={t("auth:register.description")}
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
          <RegisterForm {...register} />
        </div>
      </AuthCard>

      <p className="text-sm text-muted-foreground">
        {t("auth:register.alreadyHaveAccount")}{" "}
        <Link
          to={ROUTES.login}
          className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
        >
          {t("auth:register.signIn")}
        </Link>
      </p>
    </div>
  )
}