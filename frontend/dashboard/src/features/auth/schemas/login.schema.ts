import type { TFunction } from "i18next"
import { z } from "zod"

/**
 * Login schema — minimal friction.
 * No password complexity rules here: credential validity belongs to the backend.
 * Message strings are localized per active language.
 */
export function createLoginSchema(t: TFunction) {
  return z.object({
    email: z
      .string()
      .min(1, t("auth:validation.emailRequired"))
      .email(t("auth:validation.emailInvalid")),
    password: z.string().min(1, t("auth:validation.passwordRequired")),
  })
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>