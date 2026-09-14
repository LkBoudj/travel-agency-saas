import type { TFunction } from "i18next"
import { z } from "zod"
import { createPasswordSchema } from "./password.schema"

/**
 * Register schema — account step only.
 * Validation lives outside the component; the form consumes it via the
 * `use-register` hook. Messages are localized.
 */
export function createRegisterSchema(t: TFunction) {
  return z.object({
    email: z
      .string()
      .min(1, t("auth:validation.emailRequired"))
      .email(t("auth:validation.emailInvalid")),
    password: createPasswordSchema(t),
  })
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>