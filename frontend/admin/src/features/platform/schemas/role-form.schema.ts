import { z } from "zod"

export const ROLE_NAME_MAX_LENGTH = 100
export const ROLE_DESCRIPTION_MAX_LENGTH = 5000

export const roleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Role name is required")
    .max(
      ROLE_NAME_MAX_LENGTH,
      `Role name must be ${ROLE_NAME_MAX_LENGTH} characters or fewer`
    ),
  description: z
    .string()
    .trim()
    .max(
      ROLE_DESCRIPTION_MAX_LENGTH,
      `Description must be ${ROLE_DESCRIPTION_MAX_LENGTH} characters or fewer`
    ),
})

export type RoleFormValues = z.infer<typeof roleFormSchema>
