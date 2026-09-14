import type { BaseSyntheticEvent } from "react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ForgotPasswordFormValues } from "../schemas/forgot-password.schema"

export type ForgotPasswordFormProps = {
  /** Form orchestration built by the `use-forgot-password` hook. */
  form: UseFormReturn<ForgotPasswordFormValues>
  /** Pre-built submit handler from the `use-forgot-password` hook. */
  handleSubmit: (e?: BaseSyntheticEvent) => void
  /** Real RHF submission state — only flips when a future mutation resolves. */
  isSubmitting?: boolean
  /** Reserved for future server errors. Never set until a real backend exists. */
  authError?: string
  /** Reserved for the future neutral success state ("Check your email"). */
  notice?: string
}

export function ForgotPasswordForm({
  form,
  handleSubmit,
  isSubmitting = false,
  authError,
  notice,
}: ForgotPasswordFormProps) {
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
            {t("auth:forgotPassword.noticeTitle")}
          </span>{" "}
          {t("auth:forgotPassword.noticeBody")}
        </p>
      )}

      {authError && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {authError}
        </p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("auth:forgotPassword.emailLabel")}</Label>
        <Input
          id="email"
          type="email"
          dir="ltr"
          autoComplete="email"
          placeholder={t("auth:forgotPassword.emailPlaceholder")}
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

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting
          ? t("auth:forgotPassword.sending")
          : t("auth:forgotPassword.submit")}
      </Button>
    </form>
  )
}