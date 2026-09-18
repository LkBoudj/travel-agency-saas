import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  addMember,
  membersQueryKeys,
  removeMember,
  replaceMemberRoles,
  setMemberStatus,
} from "../api/members.api"
import type {
  AddMemberPayload,
  ReplaceRolesPayload,
  SetMemberStatusPayload,
} from "../types/members.types"

/**
 * Every member mutation invalidates the same narrow slice: this agency's member
 * queries and nothing else.
 *
 * The key is prefixed with the agency code, so a change here never refetches
 * another agency's data — or the rest of the application.
 */
function useInvalidateMembers(agencyCode: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: membersQueryKeys.all(agencyCode) })
}

export function useAddMember(agencyCode: string) {
  const invalidate = useInvalidateMembers(agencyCode)
  return useMutation({
    mutationFn: (payload: AddMemberPayload) => addMember(agencyCode, payload),
    onSuccess: invalidate,
  })
}

export function useReplaceMemberRoles(agencyCode: string) {
  const invalidate = useInvalidateMembers(agencyCode)
  return useMutation({
    mutationFn: (input: { userCode: string; payload: ReplaceRolesPayload }) =>
      replaceMemberRoles(agencyCode, input.userCode, input.payload),
    onSuccess: invalidate,
  })
}

export function useSetMemberStatus(agencyCode: string) {
  const invalidate = useInvalidateMembers(agencyCode)
  return useMutation({
    mutationFn: (input: { userCode: string; payload: SetMemberStatusPayload }) =>
      setMemberStatus(agencyCode, input.userCode, input.payload),
    onSuccess: invalidate,
  })
}

export function useRemoveMember(agencyCode: string) {
  const invalidate = useInvalidateMembers(agencyCode)
  return useMutation({
    mutationFn: (userCode: string) => removeMember(agencyCode, userCode),
    onSuccess: invalidate,
  })
}
