import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useForm, useWatch } from "react-hook-form"
import {
  createResetPasswordSchema,
  type ResetPasswordFormValues,
} from "../schemas/reset-password.schema"

/**
 * Reset-password flow orchestration.
 *
 * Wire a real reset mutation into `onSubmit` later — no backend exists yet.
 * The backend reset token (e.g. `?token=...`) and post-success navigation
 * will be handled here without touching the form or the page.
 */
export function useResetPassword(
  onSubmit?: (data: ResetPasswordFormValues) => void
) {
  const { t } = useTranslation()

  const resolver = useMemo(
    () => zodResolver(createResetPasswordSchema(t)),
    [t]
  )

  const form = useForm<ResetPasswordFormValues>({
    resolver,
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  })

  const newPassword = useWatch({ name: "newPassword", control: form.control })
  const handleSubmit = form.handleSubmit((data) => onSubmit?.(data))

  return {
    form,
    newPassword,
    handleSubmit,
    isSubmitting: form.formState.isSubmitting,
  }
}