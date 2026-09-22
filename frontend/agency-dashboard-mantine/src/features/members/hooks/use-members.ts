import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import {
  requestCreateMemberInvitation,
  requestMemberInvitations,
  requestRevokeMemberInvitation,
} from '../api/member-invitations.api.ts';
import {
  requestAvailableRoles,
  requestAgencyMembers,
  requestRemoveMember,
  requestReplaceMemberRoles,
  requestSetMemberStatus,
} from '../api/members.api.ts';
import { membersQueryKeys } from '../queries/members.queries.ts';
import type { MemberInvitationStatus } from '../types.ts';

export function useAgencyMembers(search = '') {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: membersQueryKeys.list(code, search),
    queryFn: () => requestAgencyMembers(code, search),
    staleTime: 30_000,
  });
}

export function useAvailableRoles(enabled = true) {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: membersQueryKeys.availableRoles(code),
    queryFn: () => requestAvailableRoles(code),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useMemberInvitations(status?: MemberInvitationStatus) {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: membersQueryKeys.invitations(code, status),
    queryFn: () => requestMemberInvitations(code, status),
    staleTime: 30_000,
  });
}

export function useMembersMutations() {
  const { code } = useAgencyContext();
  const queryClient = useQueryClient();

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: membersQueryKeys.root(code) }),
      queryClient.invalidateQueries({ queryKey: ['agency', code, 'member-invitations'] }),
    ]);

  const replaceRoles = useMutation({
    mutationFn: ({ userCode, roleKeys }: { userCode: string; roleKeys: string[] }) =>
      requestReplaceMemberRoles(code, userCode, roleKeys),
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: ({ userCode, status }: { userCode: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      requestSetMemberStatus(code, userCode, status),
    onSuccess: invalidate,
  });

  const removeMember = useMutation({
    mutationFn: ({ userCode }: { userCode: string }) => requestRemoveMember(code, userCode),
    onSuccess: invalidate,
  });

  const createInvitation = useMutation({
    mutationFn: ({ email, roleKeys }: { email: string; roleKeys: string[] }) =>
      requestCreateMemberInvitation(code, email, roleKeys),
    onSuccess: invalidate,
  });

  const revokeInvitation = useMutation({
    mutationFn: ({ invitationCode }: { invitationCode: string }) =>
      requestRevokeMemberInvitation(code, invitationCode),
    onSuccess: invalidate,
  });

  return { replaceRoles, setStatus, removeMember, createInvitation, revokeInvitation };
}
