import type { BaseSyntheticEvent } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ROUTES } from "@/app/router/route-paths"
import type { LoginFormValues } from "../schemas/login.schema"
import { PasswordField } from "./password-field"

export type LoginFormProps = {
  /** Form orchestration built by the `use-login` hook. */
  form: UseFormReturn<LoginFormValues>
  /** Pre-built submit handler from the `use-login` hook. */
  handleSubmit: (e?: BaseSyntheticEvent) => void
  /**
   * Reserved for future server auth errors (e.g. "Invalid email or password.").
   * Never set until a real backend exists.
   */
  authError?: string
}

export function LoginForm({ form, handleSubmit, authError }: LoginFormProps) {
  const { t } = useTranslation()
  const {
    register,
    formState: { errors },
  } = form

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4"
    >
      {authError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {authError}
        </p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("auth:login.emailLabel")}</Label>
        <Input
          id="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          placeholder={t("auth:login.emailPlaceholder")}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <PasswordField
        id="password"
        label={t("auth:login.passwordLabel")}
        autoComplete="current-password"
        placeholder={t("auth:login.passwordPlaceholder")}
        error={errors.password?.message}
        labelAction={
          <Link
            to={ROUTES.forgotPassword}
            className="text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {t("auth:login.forgotPassword")}
          </Link>
        }
        {...register("password")}
      />

      <Button type="submit" className="mt-2 w-full">
        {t("auth:login.submit")}
      </Button>
    </form>
  )
}