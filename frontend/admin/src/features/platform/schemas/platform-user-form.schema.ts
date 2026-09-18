import { z } from "zod"

export const PLATFORM_USER_PASSWORD_MIN_LENGTH = 8
export const PLATFORM_USER_PASSWORD_MAX_LENGTH = 72
export const PLATFORM_USER_NAME_MAX_LENGTH = 100
export const MAX_PLATFORM_USER_ROLES = 50

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .email("Enter a valid email address")

function optionalNameSchema(label: string) {
  return z
    .string()
    .trim()
    .max(
      PLATFORM_USER_NAME_MAX_LENGTH,
      `${label} must be ${PLATFORM_USER_NAME_MAX_LENGTH} characters or fewer`
    )
    .optional()
}

/**
 * Create form owned by the client. Mirrors the backend's create boundaries
 * (email, password 8–72, optional names, 1–50 role keys) and adds a password
 * confirmation step. Codes, status and scope are never entered here.
 */
export const createPlatformUserFormSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(
        PLATFORM_USER_PASSWORD_MIN_LENGTH,
        `Password must be at least ${PLATFORM_USER_PASSWORD_MIN_LENGTH} characters`
      )
      .max(
        PLATFORM_USER_PASSWORD_MAX_LENGTH,
        `Password must be ${PLATFORM_USER_PASSWORD_MAX_LENGTH} characters or fewer`
      ),
    confirmPassword: z.string().min(1, "Confirm your password"),
    firstName: optionalNameSchema("First name"),
    lastName: optionalNameSchema("Last name"),
    roleKeys: z
      .array(z.string())
      .min(1, "Select at least one role")
      .max(
        MAX_PLATFORM_USER_ROLES,
        `Select up to ${MAX_PLATFORM_USER_ROLES} roles`
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

export type CreatePlatformUserFormValues = z.infer<
  typeof createPlatformUserFormSchema
>

/**
 * Profile edit form: email is always present in the UI (prefilled), names are
 * optional. Identity, status and role assignments have dedicated controls.
 */
export const updatePlatformUserFormSchema = z.object({
  email: emailSchema,
  firstName: optionalNameSchema("First name"),
  lastName: optionalNameSchema("Last name"),
})

export type UpdatePlatformUserFormValues = z.infer<
  typeof updatePlatformUserFormSchema
>