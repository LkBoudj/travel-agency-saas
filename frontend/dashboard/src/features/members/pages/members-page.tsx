import { useState } from "react"
import { SearchIcon } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { appToastManager } from "@/components/ui/toast"
import { useAgencyContext } from "@/features/agency-context/hooks/use-agency-context"
import { ManageRolesDialog } from "../components/manage-roles-dialog"
import { MemberDetailsDialog } from "../components/member-details-dialog"
import { MembersTable } from "../components/members-table"
import { useDebouncedValue } from "../hooks/use-debounced-value"
import { useMemberCapabilities } from "../hooks/use-member-capabilities"
import { useMembers } from "../hooks/use-members"
import {
  useRemoveMember,
  useSetMemberStatus,
} from "../hooks/use-member-mutations"
import { getMemberErrorMessage } from "../lib/member-error-adapter"
import { memberDisplayName } from "../lib/member-display"
import { reactivatePayload, suspendPayload } from "../lib/member-payloads"
import type { AgencyMember } from "../types/members.types"

/**
 * Members of the agency in the URL.
 *
 * The agency comes from `useAgencyContext`, which resolved `:agencyCode`, so
 * this page has no notion of a "current agency" of its own and two tabs can sit
 * in two agencies at once.
 *
 * Every control here is gated twice: by permission (UX) and, for the owner, by
 * the ownership invariant. Neither replaces the backend guards.
 */
export function MembersPage() {
  const { agency } = useAgencyContext()
  const capabilities = useMemberCapabilities()

  const [search, setSearch] = useState("")
  const debouncedSearch = useDebouncedValue(search, 300)

  const [detailsFor, setDetailsFor] = useState<AgencyMember | null>(null)
  const [rolesFor, setRolesFor] = useState<AgencyMember | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<AgencyMember | null>(null)
  const [removeTarget, setRemoveTarget] = useState<AgencyMember | null>(null)

  const membersQuery = useMembers(
    agency.code,
    debouncedSearch,
    capabilities.canView
  )
  const setStatus = useSetMemberStatus(agency.code)
  const removeMember = useRemoveMember(agency.code)

  const pendingUserCode =
    setStatus.isPending || removeMember.isPending
      ? (setStatus.variables?.userCode ?? removeMember.variables ?? null)
      : null

  const fail = (error: unknown) =>
    appToastManager.add({ title: getMemberErrorMessage(error) })

  const changeStatus = (member: AgencyMember, suspend: boolean) => {
    setStatus.mutate(
      {
        userCode: member.code,
        payload: suspend ? suspendPayload() : reactivatePayload(),
      },
      {
        onSuccess: () =>
          appToastManager.add({
            title: suspend
              ? `${memberDisplayName(member)} can no longer access this agency.`
              : `${memberDisplayName(member)} can access this agency again.`,
          }),
        onError: fail,
      }
    )
  }

  const confirmRemove = (member: AgencyMember) => {
    removeMember.mutate(member.code, {
      onSuccess: () =>
        appToastManager.add({
          title: `${memberDisplayName(member)} was removed from this agency.`,
        }),
      onError: fail,
    })
    setRemoveTarget(null)
  }

  // AGENCY_MEMBER_VIEW gates the data itself, so without it there is nothing
  // truthful to render — the list request would be refused.
  if (!capabilities.canView) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Members"
          description="Manage the people who have access to this agency."
        />
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">
          You do not have permission to view the members of this agency.
        </p>
      </div>
    )
  }

  const members = membersQuery.data ?? []
  const searching = debouncedSearch.trim().length > 0

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Members"
        description="Manage the people who have access to this agency."
      />

      <div className="relative max-w-sm">
        <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search members"
          aria-label="Search members"
          className="ps-8"
        />
      </div>

      {membersQuery.isPending ? (
        <p className="rounded-xl border p-6 text-sm text-muted-foreground">
          Loading members...
        </p>
      ) : membersQuery.isError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            {getMemberErrorMessage(membersQuery.error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void membersQuery.refetch()}
          >
            Try again
          </Button>
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border p-6">
          <p className="text-sm text-muted-foreground">
            {searching
              ? `No members match "${debouncedSearch.trim()}".`
              : "This agency has no members yet."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {membersQuery.isFetching ? (
            <p className="text-xs text-muted-foreground">Updating...</p>
          ) : null}
          <MembersTable
            members={members}
            capabilities={capabilities}
            pendingUserCode={pendingUserCode}
            onViewDetails={setDetailsFor}
            onManageRoles={setRolesFor}
            onSuspend={setSuspendTarget}
            onReactivate={(member) => changeStatus(member, false)}
            onRemove={setRemoveTarget}
          />
        </div>
      )}

      <MemberDetailsDialog
        member={detailsFor}
        onOpenChange={(open) => {
          if (!open) setDetailsFor(null)
        }}
      />

      <ManageRolesDialog
        agencyCode={agency.code}
        member={rolesFor}
        onOpenChange={(open) => {
          if (!open) setRolesFor(null)
        }}
      />

      <ConfirmDialog
        open={suspendTarget !== null}
        onOpenChange={(open) => {
          if (!open) setSuspendTarget(null)
        }}
        title="Suspend this member?"
        description="This removes access to this agency only. Their account stays active and any access they have elsewhere is unaffected."
        confirmLabel="Suspend"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (suspendTarget) changeStatus(suspendTarget, true)
          setSuspendTarget(null)
        }}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
        title="Remove this member?"
        description="Their access to this agency is removed. Their account is not deleted, and any access they have in other agencies is unaffected."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          if (removeTarget) confirmRemove(removeTarget)
        }}
      />
    </div>
  )
}
