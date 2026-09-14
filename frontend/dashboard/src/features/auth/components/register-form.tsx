import type { BaseSyntheticEvent, ReactNode } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { RegisterFormValues } from "../schemas/register.schema"
import { PasswordField } from "./password-field"

export type RegisterFormProps = {
  /** Form orchestration built by the `use-register` hook. */
  form: UseFormReturn<RegisterFormValues>
  /** Live password value, drives the strength meter. */
  password?: string
  /** Pre-built submit handler from the `use-register` hook. */
  handleSubmit: (e?: BaseSyntheticEvent) => void
}

export function RegisterForm({
  form,
  password,
  handleSubmit,
}: RegisterFormProps) {
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
      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("auth:register.emailLabel")}</Label>
        <Input
          id="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          placeholder={t("auth:register.emailPlaceholder")}
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
        label={t("auth:register.passwordLabel")}
        autoComplete="new-password"
        placeholder={t("auth:register.passwordPlaceholder")}
        showStrength
        value={password}
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" className="mt-2 w-full">
        {t("auth:register.submit")}
      </Button>

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        {t("auth:register.termsPrefix")} <LinkText>{t("auth:register.termsOfService")}</LinkText>{" "}
        {t("auth:register.termsAnd")} <LinkText>{t("auth:register.privacyPolicy")}</LinkText>.
      </p>
    </form>
  )
}

/** Inline link-styled element. Replaced with real links when pages exist. */
function LinkText({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="font-medium text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
    >
      {children}
    </button>
  )
}