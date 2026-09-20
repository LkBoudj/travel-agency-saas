import { z } from 'zod';
import { roleKeySchema } from '../rbac/rbac.schemas.js';

export const MAX_INVITATION_ROLES = 50;

/**
 * An invitation is keyed to an EMAIL, never to an account.
 *
 * `.strict()` and the shape below are the invitation's privacy contract:
 * no account code, no id, no "existing/new" hint may ever be submitted. The
 * backend decides account handling only at acceptance time, inside one
 * transaction, and returns a uniform response either way.
 */
export const createMemberInvitationSchema = z
  .object({
    email: z.email().trim().toLowerCase(),
    // Roles offered at creation time. An empty list is valid — the invitee is
    // still a member afterwards, just empowered by whatever the owner grants
    // later. Same assignability rules as member role replacement.
    roleKeys: z.array(roleKeySchema).max(MAX_INVITATION_ROLES).default([]),
  })
  .strict();

export type CreateMemberInvitationBody = z.infer<typeof createMemberInvitationSchema>;

/**
 * Body of the public acceptance endpoint.
 *
 * There is deliberately NO email field: the email is owned by the invitation.
 * `password` is only needed when the invited address has no account yet; the
 * service enforces that based on what it finds at acceptance time, never based
 * on anything the client declares.
 */
export const acceptMemberInvitationSchema = z
  .object({
    password: z.string().min(8).max(72).optional(),
    firstName: z.string().trim().min(1).max(100).nullish(),
    lastName: z.string().trim().min(1).max(100).nullish(),
  })
  .strict();

export type AcceptMemberInvitationBody = z.infer<typeof acceptMemberInvitationSchema>;

export type MemberInvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

/**
 * The agency-side list. Filtering by status is supported so a dashboard can
 * show pending, completed, revoked and expired invitations distinctly.
 */
export const listMemberInvitationsQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED']).optional(),
});

export type ListMemberInvitationsQuery = z.infer<typeof listMemberInvitationsQuerySchema>;