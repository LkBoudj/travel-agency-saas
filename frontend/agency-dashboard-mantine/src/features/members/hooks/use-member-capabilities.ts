import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';

export interface MemberCapabilities {
  canView: boolean;
  canRoleManage: boolean;
  canInvite: boolean;
  canUpdate: boolean;
  canRemove: boolean;
}

/** Which member-management actions the current user's permissions allow. */
export function useMemberCapabilities(): MemberCapabilities {
  const { can } = useAgencyContext();
  return {
    canView: can('AGENCY_MEMBER_VIEW'),
    canRoleManage: can('AGENCY_MEMBER_ROLE_MANAGE'),
    canInvite: can('AGENCY_MEMBER_INVITE'),
    canUpdate: can('AGENCY_MEMBER_UPDATE'),
    canRemove: can('AGENCY_MEMBER_REMOVE'),
  };
}
