import { Dialog } from "@base-ui/react/dialog"
import { Button } from "@/components/ui/button"
import {
  formatJoinedAt,
  memberDisplayName,
  memberInitials,
  memberRolesLabel,
  membershipStatusLabel,
  membershipTypeLabel,
} from "../lib/member-display"
import type { AgencyMember } from "../types/members.types"

type MemberDetailsDialogProps = {
  member: AgencyMember | null
  onOpenChange: (open: boolean) => void
}

/**
 * Reads one member, owner included.
 *
 * Only what is true of this agency is shown. Database ids, `systemKey`, platform
 * roles, other agencies' memberships and anything password-related are absent
 * from the API response by design, so there is nothing here to filter out.
 */
export function MemberDetailsDialog({
  member,
  onOpenChange,
}: MemberDetailsDialogProps) {
  return (
    <Dialog.Root open={member !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[min(90svh,40rem)] max-w-md -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none sm:inset-x-auto sm:left-1/2 sm:right-auto sm:w-full sm:-translate-x-1/2 rtl:sm:left-auto rtl:sm:right-1/2 rtl:sm:translate-x-1/2">
          {member ? <MemberDetailsBody member={member} /> : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function MemberDetailsBody({ member }: { member: AgencyMember }) {
  return (
    <>
      <div className="flex items-center gap-3 border-b px-5 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {memberInitials(member)}
        </span>
        <span className="min-w-0">
          <Dialog.Title className="truncate text-sm font-semibold">
            {memberDisplayName(member)}
          </Dialog.Title>
          <Dialog.Description className="truncate text-xs text-muted-foreground">
            {member.email}
          </Dialog.Description>
        </span>
      </div>

      <dl className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4 text-sm">
        <DetailRow label="Membership type" value={membershipTypeLabel(member)} />
        <DetailRow
          label="Membership status"
          value={membershipStatusLabel(member)}
          hint="Access to this agency only."
        />
        <DetailRow
          label="Account status"
          value={member.accountStatus === "ACTIVE" ? "Active" : "Suspended"}
          hint="The person's account across the product."
        />
        <DetailRow label="Roles" value={memberRolesLabel(member)} />
        <DetailRow label="Joined" value={formatJoinedAt(member.joinedAt)} />
      </dl>

      <div className="flex items-center justify-end border-t px-5 py-3">
        <Dialog.Close render={<Button variant="outline" size="sm" />}>
          Close
        </Dialog.Close>
      </div>
    </>
  )
}

function DetailRow({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
