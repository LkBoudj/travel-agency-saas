import { z } from "zod"

export const ROLE_NAME_MAX_LENGTH = 100
export const ROLE_KEY_MAX_LENGTH = 64
export const ROLE_DESCRIPTION_MAX_LENGTH = 5000

export const ROLE_KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/

export const roleKeySchema = z
  .string()
  .trim()
  .min(1, "Technical key is required")
  .max(
    ROLE_KEY_MAX_LENGTH,
    `Technical key must be ${ROLE_KEY_MAX_LENGTH} characters or fewer`
  )
  .regex(
    ROLE_KEY_PATTERN,
    "Use uppercase letters, digits and underscores, starting with a letter"
  )

export const roleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .max(
      ROLE_NAME_MAX_LENGTH,
      `Role name must be ${ROLE_NAME_MAX_LENGTH} characters or fewer`
    ),
  key: roleKeySchema,
  description: z
    .string()
    .trim()
    .max(
      ROLE_DESCRIPTION_MAX_LENGTH,
      `Description must be ${ROLE_DESCRIPTION_MAX_LENGTH} characters or fewer`
    ),
})

export type RoleFormValues = z.infer<typeof roleFormSchema>
