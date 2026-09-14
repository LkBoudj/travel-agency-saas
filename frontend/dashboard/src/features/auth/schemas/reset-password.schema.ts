import type { TFunction } from "i18next"
import { z } from "zod"
import { createPasswordSchema } from "./password.schema"

/**
 * Reset-password schema — credential replacement step.
 * New password reuses the shared Auth policy; confirmation matching lives here
 * in Zod, not duplicated in the component. Messages are localized.
 */
export function createResetPasswordSchema(t: TFunction) {
  return z
    .object({
      newPassword: createPasswordSchema(t),
      confirmNewPassword: z.string().min(
        1,
        t("auth:validation.confirmRequired")
      ),
    })
    .superRefine((data, ctx) => {
      if (data.confirmNewPassword !== data.newPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmNewPassword"],
          message: t("auth:validation.passwordsMismatch"),
        })
      }
    })
}

export type ResetPasswordFormValues = z.infer<
  ReturnType<typeof createResetPasswordSchema>
>