import type { TFunction } from "i18next"
import { z } from "zod"

/**
 * Create-agency schema — second onboarding step.
 * The slug is validated only when the agency URL is edited manually.
 * Messages are localized.
 */
export function createCreateAgencySchema(t: TFunction) {
  return z.object({
    agencyName: z.string().min(2, t("auth:validation.agencyNameMin")),
    slug: z
      .string()
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        t("auth:validation.slugInvalid")
      ),
  })
}

export type CreateAgencyFormValues = z.infer<
  ReturnType<typeof createCreateAgencySchema>
>