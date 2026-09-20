import { z } from "zod"

export const AGENCY_NAME_MAX_LENGTH = 200
export const AGENCY_OWNER_CODE_MAX_LENGTH = 24
export const AGENCY_COUNTRY_MAX_LENGTH = 100
export const AGENCY_DESCRIPTION_MAX_LENGTH = 5000

const nameSchema = z
  .string()
  .trim()
  .min(1, "Agency name is required")
  .max(
    AGENCY_NAME_MAX_LENGTH,
    `Agency name must be ${AGENCY_NAME_MAX_LENGTH} characters or fewer`
  )

const countrySchema = z
  .string()
  .trim()
  .max(
    AGENCY_COUNTRY_MAX_LENGTH,
    `Country must be ${AGENCY_COUNTRY_MAX_LENGTH} characters or fewer`
  )

const descriptionSchema = z
  .string()
  .trim()
  .max(
    AGENCY_DESCRIPTION_MAX_LENGTH,
    `Description must be ${AGENCY_DESCRIPTION_MAX_LENGTH} characters or fewer`
  )

export const AGENCY_OWNER_PASSWORD_MIN_LENGTH = 8
export const AGENCY_OWNER_PASSWORD_MAX_LENGTH = 72
export const AGENCY_OWNER_NAME_MAX_LENGTH = 100

/** Which kind of owner the operator is providing. */
export const agencyOwnerTypeSchema = z.enum(["EXISTING", "NEW"])

export type AgencyOwnerType = z.infer<typeof agencyOwnerTypeSchema>

const ownerNameSchema = z
  .string()
  .trim()
  .max(
    AGENCY_OWNER_NAME_MAX_LENGTH,
    `Name must be ${AGENCY_OWNER_NAME_MAX_LENGTH} characters or fewer`
  )

/**
 * Details of an owner account that does not exist yet.
 *
 * This is a standalone form: it is filled in its own dialog, validated there,
 * and the confirmed values are carried back into the agency form. Nothing is
 * submitted from here, so the agency and its owner still reach the backend as
 * one request.
 */
export const newOwnerFormSchema = z
  .object({
    firstName: ownerNameSchema,
    lastName: ownerNameSchema,
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    password: z
      .string()
      .min(
        AGENCY_OWNER_PASSWORD_MIN_LENGTH,
        `Password must be at least ${AGENCY_OWNER_PASSWORD_MIN_LENGTH} characters`
      )
      .max(
        AGENCY_OWNER_PASSWORD_MAX_LENGTH,
        `Password must be ${AGENCY_OWNER_PASSWORD_MAX_LENGTH} characters or fewer`
      ),
    confirmPassword: z.string().min(1, "Confirm the password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

export type NewOwnerFormValues = z.infer<typeof newOwnerFormSchema>

/**
 * The owner as the agency form submits it. Selection/identity data only: the
 * membership type, the canonical role and role ids are backend concerns and
 * appear nowhere in this shape.
 */
export const agencyOwnerFormValueSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("EXISTING"),
    appUserCode: z.string().trim().min(1).max(AGENCY_OWNER_CODE_MAX_LENGTH),
  }),
  z.object({
    type: z.literal("NEW"),
    firstName: ownerNameSchema,
    lastName: ownerNameSchema,
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(AGENCY_OWNER_PASSWORD_MIN_LENGTH),
  }),
])

export type AgencyOwnerFormValue = z.infer<typeof agencyOwnerFormValueSchema>

/**
 * Create form owned by the client.
 *
 * The owner is captured by an action rather than by typing into this form: the
 * operator either selects an existing account or fills in a new one, each in its
 * own focused dialog. Either way the result arrives here as `owner`, so this
 * form stays short and never exposes ownership internals (membership type, the
 * canonical role, role ids, account status), which the backend owns.
 */
export const createAgencyFormSchema = z
  .object({
    name: nameSchema,
    country: countrySchema,
    description: descriptionSchema,
    // Null until the operator picks an owner. The requirement is raised in the
    // refinement below rather than with a narrowing `.refine`, so the form value
    // type stays nullable and the field can start empty.
    owner: agencyOwnerFormValueSchema.nullable(),
  })
  .superRefine((values, ctx) => {
    if (values.owner === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["owner"],
        message: "Choose who will own this agency",
      })
    }
  })

export type CreateAgencyFormValues = z.infer<typeof createAgencyFormSchema>

/**
 * Edit form: descriptive fields only. Owner, status and code are deliberately
 * absent — status has its own action and ownership transfer is a separate
 * future operation.
 */
export const updateAgencyFormSchema = z.object({
  name: nameSchema,
  country: countrySchema,
  description: descriptionSchema,
})

export type UpdateAgencyFormValues = z.infer<typeof updateAgencyFormSchema>
