import { Button } from "@/components/ui/button"
import { hasAnyRowAction, memberRowActions } from "../lib/member-actions"
import type { MemberCapabilities } from "../lib/member-actions"
import {
  formatJoinedAt,
  hasNoRoles,
  isOwner,
  isSuspendedMember,
  memberDisplayName,
  memberInitials,
  memberRolesLabel,
  membershipStatusLabel,
  membershipTypeLabel,
} from "../lib/member-display"
import type { AgencyMember } from "../types/members.types"

type MembersTableProps = {
  members: AgencyMember[]
  capabilities: MemberCapabilities
  pendingUserCode: string | null
  onViewDetails: (member: AgencyMember) => void
  onManageRoles: (member: AgencyMember) => void
  onSuspend: (member: AgencyMember) => void
  onReactivate: (member: AgencyMember) => void
  onRemove: (member: AgencyMember) => void
}

/**
 * One row per person, however many roles they hold.
 *
 * The account code is deliberately not a column: it identifies a record for the
 * API, not a colleague for an operator. Name and email are how people are
 * recognised.
 */
export function MembersTable({
  members,
  capabilities,
  pendingUserCode,
  onViewDetails,
  onManageRoles,
  onSuspend,
  onReactivate,
  onRemove,
}: MembersTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[720px] text-[13px]">
        <thead>
          <tr className="border-b text-start text-xs whitespace-nowrap text-muted-foreground">
            <th className="px-3 py-2.5 text-start font-medium">Member</th>
            <th className="px-3 py-2.5 text-start font-medium">Roles</th>
            <th className="hidden px-3 py-2.5 text-start font-medium md:table-cell">
              Type
            </th>
            <th className="px-3 py-2.5 text-start font-medium">Status</th>
            <th className="hidden px-3 py-2.5 text-start font-medium lg:table-cell">
              Joined
            </th>
            <th className="px-3 py-2.5 text-end font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {members.map((member) => {
            const actions = memberRowActions(member, capabilities)
            const busy = pendingUserCode === member.code
            const suspended = isSuspendedMember(member)

            return (
              <tr
                key={member.code}
                className={busy ? "opacity-60" : "hover:bg-muted/40"}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                      {memberInitials(member)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {memberDisplayName(member)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {member.email}
                      </span>
                    </span>
                  </div>
                </td>

                <td className="px-3 py-2.5">
                  <span
                    className={
                      hasNoRoles(member)
                        ? "text-xs text-muted-foreground italic"
                        : ""
                    }
                  >
                    {memberRolesLabel(member)}
                  </span>
                </td>

                <td className="hidden px-3 py-2.5 md:table-cell">
                  {isOwner(member) ? (
                    <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium whitespace-nowrap">
                      Owner
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {membershipTypeLabel(member)}
                    </span>
                  )}
                </td>

                <td className="px-3 py-2.5">
                  <span
                    className={
                      suspended
                        ? "inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-destructive"
                        : "inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-muted-foreground"
                    }
                  >
                    {membershipStatusLabel(member)}
                  </span>
                </td>

                <td className="hidden px-3 py-2.5 whitespace-nowrap text-muted-foreground lg:table-cell">
                  {formatJoinedAt(member.joinedAt)}
                </td>

                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {!hasAnyRowAction(actions) ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : null}

                    {actions.canViewDetails ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={busy}
                        onClick={() => onViewDetails(member)}
                      >
                        Details
                      </Button>
                    ) : null}

                    {actions.canManageRoles ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={busy}
                        onClick={() => onManageRoles(member)}
                      >
                        Roles
                      </Button>
                    ) : null}

                    {actions.canSuspend ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={busy}
                        onClick={() => onSuspend(member)}
                      >
                        Suspend
                      </Button>
                    ) : null}

                    {actions.canReactivate ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={busy}
                        onClick={() => onReactivate(member)}
                      >
                        Reactivate
                      </Button>
                    ) : null}

                    {actions.canRemove ? (
                      <Button
                        variant="destructive"
                        size="xs"
                        disabled={busy}
                        onClick={() => onRemove(member)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
