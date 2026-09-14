import type { TFunction } from "i18next"
import { z } from "zod"

/**
 * Forgot-password schema — email only.
 * No email-existence hints here: the backend decides what to reveal.
 * Messages are localized.
 */
export function createForgotPasswordSchema(t: TFunction) {
  return z.object({
    email: z
      .string()
      .min(1, t("auth:validation.emailRequired"))
      .email(t("auth:validation.emailInvalid")),
  })
}

export type ForgotPasswordFormValues = z.infer<
  ReturnType<typeof createForgotPasswordSchema>
>