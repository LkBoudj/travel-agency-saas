import { z } from 'zod';

export const roleScopeSchema = z.enum(['PLATFORM', 'AGENCY']);

export const descriptionSchema = z
  .string()
  .trim()
  .max(5000)
  .nullish();

export const roleKeySchema = z
  .string()
  .trim()
  .min(1, { message: 'Role key is required' })
  .max(64, { message: 'Role key must be 64 characters or fewer' })
  .regex(/^[A-Z][A-Z0-9_]*$/, {
    message: 'Role key must be uppercase letters, digits and underscores, starting with a letter',
  });

/**
 * Scope is intentionally absent: it is owned by the backend (derived from the
 * endpoint) and can never be chosen, or changed, by a request. `key` is
 * required on creation and immutable afterwards (it is absent from
 * `updateRoleSchema`).
 */
export const createRoleSchema = z.object({
  key: roleKeySchema,
  name: z.string().trim().min(1).max(100),
  description: descriptionSchema,
});

export type CreateRoleBody = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: descriptionSchema.optional(),
});

export type UpdateRoleBody = z.infer<typeof updateRoleSchema>;

export const replaceRolePermissionsSchema = z.object({
  permissionKeys: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(64)
        .regex(/^[A-Z][A-Z0-9_]*$/, {
          message: 'Each permission key must be uppercase letters, digits and underscores',
        }),
    )
    .max(200),
});

export type ReplaceRolePermissionsBody = z.infer<typeof replaceRolePermissionsSchema>;
