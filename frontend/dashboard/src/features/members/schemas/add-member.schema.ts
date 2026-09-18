import { z } from "zod"

/** Mirrors the backend limits so the browser catches a typo before the request. */
export const MEMBER_PASSWORD_MIN_LENGTH = 8
export const MEMBER_PASSWORD_MAX_LENGTH = 72
export const MEMBER_NAME_MAX_LENGTH = 100

/**
 * The "new user" form.
 *
 * `confirmPassword` is a browser-side guard only. It is validated here and then
 * dropped when the payload is built — the backend schema is strict and has no
 * such field.
 */
export const newMemberFormSchema = z
  .object({
    firstName: z.string().trim().max(MEMBER_NAME_MAX_LENGTH).optional(),
    lastName: z.string().trim().max(MEMBER_NAME_MAX_LENGTH).optional(),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
    password: z
      .string()
      .min(MEMBER_PASSWORD_MIN_LENGTH, `At least ${MEMBER_PASSWORD_MIN_LENGTH} characters`)
      .max(MEMBER_PASSWORD_MAX_LENGTH, `At most ${MEMBER_PASSWORD_MAX_LENGTH} characters`),
    confirmPassword: z.string().min(1, "Confirm the password"),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      })
    }
  })

export type NewMemberFormValues = z.infer<typeof newMemberFormSchema>
