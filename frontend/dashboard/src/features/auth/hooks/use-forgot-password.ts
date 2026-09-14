import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import {
  createForgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "../schemas/forgot-password.schema"

/**
 * Forgot-password flow orchestration.
 *
 * Wire a real reset-request mutation into `onSubmit` later — no backend exists
 * yet. Future server errors, the neutral success state, and any navigation
 * belong here without touching the form or the page.
 */
export function useForgotPassword(
  onSubmit?: (data: ForgotPasswordFormValues) => void
) {
  const { t } = useTranslation()

  const resolver = useMemo(
    () => zodResolver(createForgotPasswordSchema(t)),
    [t]
  )

  const form = useForm<ForgotPasswordFormValues>({
    resolver,
    defaultValues: { email: "" },
  })

  const handleSubmit = form.handleSubmit((data) => onSubmit?.(data))

  return {
    form,
    handleSubmit,
    isSubmitting: form.formState.isSubmitting,
  }
}