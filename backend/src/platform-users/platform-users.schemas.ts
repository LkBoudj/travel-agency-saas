import { z } from 'zod';
import { roleKeySchema } from '../rbac/rbac.schemas.js';

export const platformUserStatusCodeSchema = z.enum(['ACTIVE', 'SUSPENDED']);

const optionalNameSchema = z.string().trim().min(1).max(100).nullish();

/**
 * A Platform User can be created with one or more Platform Roles. `roleKeys`
 * are required: an AppUser is only a "platform user" once it has at least one
 * PLATFORM-scoped assignment, so this endpoint never creates role-less rows.
 *
 * The output is an `AppUser` + `platformRoleAssignment` pair, created
 * atomically. Scope/status/code/passwordHash are owned by the backend and are
 * rejected if present (`.strict()`).
 */
export const createPlatformUserSchema = z
  .object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8).max(72),
    firstName: optionalNameSchema,
    lastName: optionalNameSchema,
    roleKeys: z.array(roleKeySchema).min(1).max(50),
  })
  .strict();

export type CreatePlatformUserBody = z.infer<typeof createPlatformUserSchema>;

/**
 * Profile edit owns `email`, `firstName` and `lastName` only. The identity
 * fields (`code`, `passwordHash`), the account `status` and the role
 * assignments are never accepted here; they have dedicated endpoints.
 * `.strict()` rejects any other key.
 */
export const updatePlatformUserSchema = z
  .object({
    email: z.email().trim().toLowerCase().optional(),
    firstName: optionalNameSchema.optional(),
    lastName: optionalNameSchema.optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.email !== undefined || data.firstName !== undefined || data.lastName !== undefined,
    { message: 'At least one field must be provided' },
  );

export type UpdatePlatformUserBody = z.infer<typeof updatePlatformUserSchema>;

export const setPlatformUserStatusSchema = z
  .object({
    status: platformUserStatusCodeSchema,
  })
  .strict();

export type SetPlatformUserStatusBody = z.infer<typeof setPlatformUserStatusSchema>;

export const replacePlatformUserRolesSchema = z
  .object({
    roleKeys: z.array(roleKeySchema).min(1).max(50),
  })
  .strict();

export type ReplacePlatformUserRolesBody = z.infer<typeof replacePlatformUserRolesSchema>;

export const listPlatformUsersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
});

export type ListPlatformUsersQuery = z.infer<typeof listPlatformUsersQuerySchema>;