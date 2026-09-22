import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useConfirmDialog } from '../../../components/confirm-dialog.tsx';
import { useDebouncedSearch } from '../../../components/search-input.tsx';
import { useCurrentUser } from '../../auth/hooks/use-auth.ts';
import { nextMembershipStatus } from '../lib/member-actions.ts';
import { memberDisplayName } from '../lib/member-display.ts';
import { getMemberErrorMessage } from '../lib/member-error-messages.ts';
import type { AgencyMember, MemberInvitation } from '../types.ts';
import { useMemberCapabilities } from './use-member-capabilities.ts';
import {
  useAgencyMembers,
  useAvailableRoles,
  useMemberInvitations,
  useMembersMutations,
} from './use-members.ts';

export interface MembersPageController {
  members: AgencyMember[];
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  search: ReturnType<typeof useDebouncedSearch>;
  currentUserCode?: string;
  canInvite: boolean;
  canRoleManage: boolean;
  canAssignRoles: boolean;
  canUpdate: boolean;
  canRemove: boolean;
  isInviteDialogOpen: boolean;
  openInviteDialog: () => void;
  closeInviteDialog: () => void;
  rolesTarget: AgencyMember | null;
  openRolesDialog: (member: AgencyMember) => void;
  closeRolesDialog: () => void;
  saveMemberRoles: (roleKeys: string[]) => void;
  isSavingRoles: boolean;
  submitInvite: (values: { email: string; roleKeys: string[] }) => void;
  isSubmittingInvite: boolean;
  toggleMemberStatus: (member: AgencyMember) => void;
  removeMember: (member: AgencyMember) => void;
  invitations: MemberInvitation[];
  invitationsPending: boolean;
  canRevoke: boolean;
  revokeInvitation: (invitation: MemberInvitation) => void;
  availableRoles: { key: string; name: string; description: string | null }[];
  rolesPending: boolean;
}

export function useMembersPage(): MembersPageController {
  const { t } = useTranslation('members');
  const confirm = useConfirmDialog();
  const capabilities = useMemberCapabilities();
  const { data: currentUser } = useCurrentUser();
  const { raw, value, setRaw } = useDebouncedSearch();

  const membersQuery = useAgencyMembers(value);
  const invitationsQuery = useMemberInvitations();
  const availableRolesQuery = useAvailableRoles(capabilities.canRoleManage);

  const {
    replaceRoles,
    setStatus,
    removeMember: removeMemberMutation,
    createInvitation,
    revokeInvitation: revokeInvitationMutation,
  } = useMembersMutations();

  const [isInviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [rolesTarget, setRolesTarget] = useState<AgencyMember | null>(null);

  const openInviteDialog = () => setInviteDialogOpen(true);
  const closeInviteDialog = () => setInviteDialogOpen(false);
  const openRolesDialog = (member: AgencyMember) => setRolesTarget(member);
  const closeRolesDialog = () => setRolesTarget(null);

  const notifyError = (error: unknown) => {
    notifications.show({ message: getMemberErrorMessage(error, t), color: 'red' });
  };

  const notifySuccess = (key: string) => {
    notifications.show({ message: t(key), color: 'teal' });
  };

  const saveMemberRoles = (roleKeys: string[]) => {
    if (!rolesTarget) {
      return;
    }
    replaceRoles.mutate(
      { userCode: rolesTarget.code, roleKeys },
      {
        onSuccess: () => {
          closeRolesDialog();
          notifySuccess('rolesDialog.success');
        },
        onError: notifyError,
      }
    );
  };

  const submitInvite = (values: { email: string; roleKeys: string[] }) => {
    createInvitation.mutate(values, {
      onSuccess: () => {
        closeInviteDialog();
        notifySuccess('inviteDialog.success');
      },
      onError: notifyError,
    });
  };

  const toggleMemberStatus = (member: AgencyMember) => {
    const status = nextMembershipStatus(member.membershipStatus);
    const isActivating = status === 'ACTIVE';
    confirm({
      title: t(isActivating ? 'confirm.reactivateTitle' : 'confirm.suspendTitle', {
        name: memberDisplayName(member),
      }),
      message: t(isActivating ? 'confirm.reactivateBody' : 'confirm.suspendBody'),
      color: isActivating ? 'teal' : 'orange',
      onConfirm: () =>
        setStatus.mutate(
          { userCode: member.code, status },
          {
            onError: notifyError,
          }
        ),
    });
  };

  const removeMember = (member: AgencyMember) => {
    confirm({
      title: t('confirm.removeTitle', { name: memberDisplayName(member) }),
      message: t('confirm.removeBody'),
      color: 'red',
      onConfirm: () =>
        removeMemberMutation.mutate(
          { userCode: member.code },
          {
            onError: notifyError,
          }
        ),
    });
  };

  const revokeInvitation = (invitation: MemberInvitation) => {
    confirm({
      title: t('confirm.revokeTitle', { email: invitation.email }),
      message: t('confirm.revokeBody'),
      color: 'red',
      onConfirm: () =>
        revokeInvitationMutation.mutate(
          { invitationCode: invitation.code },
          {
            onError: notifyError,
          }
        ),
    });
  };

  return {
    members: membersQuery.data ?? [],
    isPending: membersQuery.isPending,
    isError: membersQuery.isError,
    refetch: membersQuery.refetch,
    search: { raw, value, setRaw },
    currentUserCode: currentUser?.code,
    canInvite: capabilities.canInvite,
    canRoleManage: capabilities.canRoleManage,
    canAssignRoles: capabilities.canRoleManage,
    canUpdate: capabilities.canUpdate,
    canRemove: capabilities.canRemove,
    isInviteDialogOpen,
    openInviteDialog,
    closeInviteDialog,
    rolesTarget,
    openRolesDialog,
    closeRolesDialog,
    saveMemberRoles,
    isSavingRoles: replaceRoles.isPending,
    submitInvite,
    isSubmittingInvite: createInvitation.isPending,
    toggleMemberStatus,
    removeMember,
    invitations: invitationsQuery.data ?? [],
    invitationsPending: invitationsQuery.isPending,
    canRevoke: capabilities.canInvite,
    revokeInvitation,
    availableRoles: availableRolesQuery.data ?? [],
    rolesPending: availableRolesQuery.isPending,
  };
}
