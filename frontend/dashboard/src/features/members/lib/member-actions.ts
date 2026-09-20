// Explicit .ts extension: this module is loaded directly by `node --test`,
// whose ESM resolver does not guess extensions. `allowImportingTsExtensions`
// is enabled and Vite resolves it, so one definition of ownership serves both.
import { isOwner } from "./member-display.ts"

export const MEMBER_PERMISSIONS = {
  view: "AGENCY_MEMBER_VIEW",
  roleManage: "AGENCY_MEMBER_ROLE_MANAGE",
  update: "AGENCY_MEMBER_UPDATE",
  remove: "AGENCY_MEMBER_REMOVE",
} as const

/** What the signed-in member is permitted to do, as far as the UI can tell. */
export type MemberCapabilities = {
  canView: boolean
  canManageRoles: boolean
  canUpdate: boolean
  canRemove: boolean
}

type MemberLike = { membershipType: string; membershipStatus: string }

/**
 * Which row actions to render for one member.
 *
 * Two independent gates, and both must pass:
 *
 *  1. Permission — UX only. Hiding a control the caller cannot use avoids
 *     offering a guaranteed 403, but the backend guard is what actually
 *     enforces it.
 *  2. Ownership — a product invariant. The owner's roles, status and
 *     membership are part of the ownership guarantee, so those actions are not
 *     offered for them at all. The backend rejects them regardless with
 *     OWNER_ROLES_IMMUTABLE / OWNER_CANNOT_BE_SUSPENDED / OWNER_CANNOT_BE_REMOVED.
 *
 * Ownership transfer is deliberately out of scope, so there is no "make owner".
 */
export function memberRowActions(
  member: MemberLike,
  capabilities: MemberCapabilities
) {
  const owner = isOwner(member)
  const suspended = member.membershipStatus === "SUSPENDED"

  return {
    /** Details are readable for everyone, owner included. */
    canViewDetails: capabilities.canView,
    canManageRoles: capabilities.canManageRoles && !owner,
    canSuspend: capabilities.canUpdate && !owner && !suspended,
    canReactivate: capabilities.canUpdate && !owner && suspended,
    canRemove: capabilities.canRemove && !owner,
  }
}

export type MemberRowActions = ReturnType<typeof memberRowActions>

/** Whether any action at all is available, so an empty menu is never rendered. */
export function hasAnyRowAction(actions: MemberRowActions): boolean {
  return (
    actions.canViewDetails ||
    actions.canManageRoles ||
    actions.canSuspend ||
    actions.canReactivate ||
    actions.canRemove
  )
}
