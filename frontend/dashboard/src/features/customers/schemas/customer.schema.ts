import type { TFunction } from "i18next"
import { z } from "zod"

/**
 * Create/Edit form schema — the five contact fields, all optional.
 *
 * Validation lives here, never in `onSubmit`. An empty email passes; a
 * non-empty one must be well-formed. Blank strings are turned into `null`
 * payloads by `buildCustomerPayload`, matching the backend's clear-semantics.
 */
export function createCustomerFormSchema(t: TFunction) {
  return z.object({
    firstName: z
      .string()
      .trim()
      .max(100, t("customers:validation.firstNameMax")),
    lastName: z
      .string()
      .trim()
      .max(100, t("customers:validation.lastNameMax")),
    email: z.string().trim().refine(
      (value) =>
        value.length === 0 || z.string().email().safeParse(value).success,
      { message: t("customers:validation.email") }
    ),
    phone: z
      .string()
      .trim()
      .max(32, t("customers:validation.phoneMax")),
    notes: z
      .string()
      .trim()
      .max(2000, t("customers:validation.notesMax")),
  })
}

export type CustomerFormValues = z.infer<
  ReturnType<typeof createCustomerFormSchema>
>