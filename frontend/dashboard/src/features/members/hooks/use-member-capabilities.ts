import { useAgencyPermission } from "@/features/agency-context/hooks/use-agency-permission"
import { MEMBER_PERMISSIONS } from "../lib/member-actions"
import type { MemberCapabilities } from "../lib/member-actions"

/**
 * What the signed-in member may do with members here, for UX decisions only.
 *
 * Hiding a control the caller cannot use is courtesy, not security: every one
 * of these operations is independently guarded by the backend.
 */
export function useMemberCapabilities(): MemberCapabilities {
  return {
    canView: useAgencyPermission(MEMBER_PERMISSIONS.view),
    canInvite: useAgencyPermission(MEMBER_PERMISSIONS.invite),
    canManageRoles: useAgencyPermission(MEMBER_PERMISSIONS.roleManage),
    canUpdate: useAgencyPermission(MEMBER_PERMISSIONS.update),
    canRemove: useAgencyPermission(MEMBER_PERMISSIONS.remove),
  }
}
