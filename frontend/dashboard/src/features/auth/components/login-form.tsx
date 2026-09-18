import type { BaseSyntheticEvent } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ROUTES } from "@/app/router/route-paths"
import type { LoginFormValues } from "../schemas/login.schema"
import { Loader2Icon } from "lucide-react"

import { PasswordField } from "./password-field"

export type LoginFormProps = {
  /** Form orchestration built by the `use-login` hook. */
  form: UseFormReturn<LoginFormValues>
  /** Pre-built submit handler from the `use-login` hook. */
  handleSubmit: (e?: BaseSyntheticEvent) => void
  /** Server-side sign-in failure, already mapped to a friendly message. */
  errorMessage?: string
  /** True while the sign-in request is in flight. */
  isPending?: boolean
}

export function LoginForm({
  form,
  handleSubmit,
  errorMessage,
  isPending,
}: LoginFormProps) {
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
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {errorMessage}
        </p>
      ) : null}

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

      <Button type="submit" className="mt-2 w-full" disabled={isPending}>
        {isPending ? <Loader2Icon className="animate-spin" /> : null}
        {t("auth:login.submit")}
      </Button>
    </form>
  )
}