import { z } from 'zod';
import { roleKeySchema } from '../rbac/rbac.schemas.js';

export const MAX_MEMBER_ROLES = 50;


/**
 * Roles requested for a member.
 *
 * An empty list is deliberately allowed: `membershipType = EMPLOYEE` already
 * classifies the person, so no placeholder "Employee" role is invented. An
 * ACTIVE employee with zero roles is a valid member with zero business
 * permissions.
 */
const roleKeysSchema = z.array(roleKeySchema).max(MAX_MEMBER_ROLES).default([]);

export const replaceAgencyMemberRolesSchema = z
  .object({
    roleKeys: roleKeysSchema,
  })
  .strict();

export type ReplaceAgencyMemberRolesBody = z.infer<typeof replaceAgencyMemberRolesSchema>;

export const agencyMembershipStatusSchema = z.enum(['ACTIVE', 'SUSPENDED']);

/**
 * Suspends or reactivates a membership in THIS agency only. It never touches
 * `AppUser.status`, the member's memberships in other agencies, or their
 * platform access.
 */
export const setAgencyMemberStatusSchema = z
  .object({
    status: agencyMembershipStatusSchema,
  })
  .strict();

export type SetAgencyMemberStatusBody = z.infer<typeof setAgencyMemberStatusSchema>;

export const listAgencyMembersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
});

export type ListAgencyMembersQuery = z.infer<typeof listAgencyMembersQuerySchema>;
