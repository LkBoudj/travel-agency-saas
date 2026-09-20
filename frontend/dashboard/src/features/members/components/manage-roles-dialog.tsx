import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Button } from "@/components/ui/button"
import { appToastManager } from "@/components/ui/toast"
import { useAssignableRoles } from "../hooks/use-assignable-roles"
import { useReplaceMemberRoles } from "../hooks/use-member-mutations"
import { getMemberErrorMessage } from "../lib/member-error-adapter"
import { buildReplaceRolesPayload } from "../lib/member-payloads"
import { memberDisplayName } from "../lib/member-display"
import { RoleSelector } from "./role-selector"
import type { AgencyMember } from "../types/members.types"

type ManageRolesDialogProps = {
  agencyCode: string
  member: AgencyMember | null
  onOpenChange: (open: boolean) => void
}

/**
 * Replaces an employee's entire role set.
 *
 * This is a replacement, not a patch: what is ticked when Save is pressed
 * becomes the member's complete set, and unticking everything is a valid way to
 * leave them with no business permissions. The owner never reaches this dialog —
 * their canonical role is an ownership invariant, and the backend rejects the
 * call with OWNER_ROLES_IMMUTABLE regardless.
 */
export function ManageRolesDialog({
  agencyCode,
  member,
  onOpenChange,
}: ManageRolesDialogProps) {
  return (
    <Dialog.Root open={member !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Popup className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[min(90svh,40rem)] max-w-md -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg outline-none sm:inset-x-auto sm:left-1/2 sm:right-auto sm:w-full sm:-translate-x-1/2 rtl:sm:left-auto rtl:sm:right-1/2 rtl:sm:translate-x-1/2">
          {member ? (
            <ManageRolesBody
              agencyCode={agencyCode}
              member={member}
              onOpenChange={onOpenChange}
            />
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ManageRolesBody({
  agencyCode,
  member,
  onOpenChange,
}: {
  agencyCode: string
  member: AgencyMember
  onOpenChange: (open: boolean) => void
}) {
  // Mounted per member, so the current roles are the starting point without an
  // effect resetting state after the fact.
  const [roleKeys, setRoleKeys] = useState<string[]>(() =>
    member.roles.map((role) => role.key)
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const rolesQuery = useAssignableRoles(agencyCode, true)
  const replaceRoles = useReplaceMemberRoles(agencyCode)

  const save = () => {
    setErrorMessage(null)
    replaceRoles.mutate(
      { userCode: member.code, payload: buildReplaceRolesPayload(roleKeys) },
      {
        onSuccess: () => {
          appToastManager.add({ title: "Roles updated." })
          onOpenChange(false)
        },
        onError: (error) => setErrorMessage(getMemberErrorMessage(error)),
      }
    )
  }

  const pending = replaceRoles.isPending

  return (
    <>
      <div className="border-b px-5 py-4">
        <Dialog.Title className="text-sm font-semibold">Manage roles</Dialog.Title>
        <Dialog.Description className="mt-1 text-xs text-muted-foreground">
          {memberDisplayName(member)}
        </Dialog.Description>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {rolesQuery.isError ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-destructive">
              {getMemberErrorMessage(rolesQuery.error)}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void rolesQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : (
          <RoleSelector
            roles={rolesQuery.data ?? []}
            selected={roleKeys}
            onChange={setRoleKeys}
            isLoading={rolesQuery.isPending}
            disabled={pending}
          />
        )}

        {errorMessage ? (
          <p role="alert" className="text-xs text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 border-t px-5 py-3">
        <Dialog.Close render={<Button variant="ghost" disabled={pending} />}>
          Cancel
        </Dialog.Close>
        <Button onClick={save} disabled={pending || rolesQuery.isError}>
          {pending ? "Saving..." : "Save roles"}
        </Button>
      </div>
    </>
  )
}
