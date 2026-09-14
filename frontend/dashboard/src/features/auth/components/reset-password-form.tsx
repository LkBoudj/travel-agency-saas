import type { BaseSyntheticEvent } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/app/router/route-paths"
import type { ResetPasswordFormValues } from "../schemas/reset-password.schema"
import { PasswordField } from "./password-field"

export type ResetPasswordFormProps = {
  /** Form orchestration built by the `use-reset-password` hook. */
  form: UseFormReturn<ResetPasswordFormValues>
  /** Live new-password value, drives the strength meter. */
  newPassword?: string
  /** Pre-built submit handler from the `use-reset-password` hook. */
  handleSubmit: (e?: BaseSyntheticEvent) => void
  /** Real RHF submission state — only flips when a future mutation resolves. */
  isSubmitting?: boolean
  /** Reserved for future server errors (e.g. invalid/expired token). */
  authError?: string
  /** Reserved for the future success state ("Password updated"). */
  notice?: string
}

export function ResetPasswordForm({
  form,
  newPassword,
  handleSubmit,
  isSubmitting = false,
  authError,
  notice,
}: ResetPasswordFormProps) {
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
      {notice && (
        <p
          role="status"
          className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground"
        >
          <span className="font-medium text-foreground">
            {t("auth:resetPassword.noticeTitle")}
          </span>{" "}
          {t("auth:resetPassword.noticeBody")}
        </p>
      )}

      {authError && (
        <p role="alert" className="mb-2 text-center text-xs text-destructive">
          {authError}
        </p>
      )}

      <PasswordField
        id="newPassword"
        label={t("auth:resetPassword.newPasswordLabel")}
        autoComplete="new-password"
        placeholder={t("auth:resetPassword.newPasswordPlaceholder")}
        showStrength
        value={newPassword}
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />

      <PasswordField
        id="confirmNewPassword"
        label={t("auth:resetPassword.confirmLabel")}
        autoComplete="new-password"
        placeholder={t("auth:resetPassword.confirmPlaceholder")}
        error={errors.confirmNewPassword?.message}
        {...register("confirmNewPassword")}
      />

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting
          ? t("auth:resetPassword.resetting")
          : t("auth:resetPassword.submit")}
      </Button>

      <Link
        to={ROUTES.login}
        className="text-center text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
      >
        {t("auth:resetPassword.backToSignIn")}
      </Link>
    </form>
  )
}