import { useState } from "react"
import { PencilIcon, PlusIcon, SearchIcon, UserPlusIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { appUserOptionLabel } from "../lib/app-user"
import type { AppUserOption } from "../types/app-user.types"
import { NewOwnerDialog, type NewOwnerDraft } from "./new-owner-dialog"
import { SelectOwnerDialog } from "./select-owner-dialog"

/**
 * The owner chosen for an agency that is being created: either an account that
 * already exists, or the details of one to create with the agency.
 */
export type OwnerSelection =
  | { type: "EXISTING"; account: AppUserOption }
  | { type: "NEW"; draft: NewOwnerDraft }

export type OwnerFieldProps = {
  value: OwnerSelection | null
  onChange: (value: OwnerSelection | null) => void
  invalid?: boolean
}

function ownerName(value: OwnerSelection): string {
  if (value.type === "EXISTING") {
    return appUserOptionLabel(value.account)
  }
  const name = [value.draft.firstName, value.draft.lastName]
    .filter(Boolean)
    .join(" ")
  return name.trim().length > 0 ? name : value.draft.email
}

function ownerEmail(value: OwnerSelection): string {
  return value.type === "EXISTING" ? value.account.email : value.draft.email
}

/**
 * Owner control for the Create Agency form.
 *
 * The two ways of providing an owner are actions, not a form section: picking an
 * existing account and describing a new one each open their own focused dialog.
 * Whatever comes back is summarised here as a single row, so the Create Agency
 * form stays short no matter which path the operator takes.
 */
export function OwnerField({ value, onChange, invalid }: OwnerFieldProps) {
  const [selectOpen, setSelectOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)

  if (value) {
    return (
      <>
        <div
          data-invalid={invalid || undefined}
          className="flex items-center justify-between gap-3 rounded-lg border p-3 data-invalid:border-destructive"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {ownerName(value).slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {ownerName(value)}
                </span>
                {value.type === "NEW" ? (
                  <Badge variant="secondary">New account</Badge>
                ) : null}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {ownerEmail(value)}
              </span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {value.type === "NEW" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setNewOpen(true)}
              >
                <PencilIcon />
                <span className="sr-only">Edit owner details</span>
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(null)}
            >
              <XIcon />
              <span className="sr-only">Remove owner</span>
            </Button>
          </div>
        </div>

        <NewOwnerDialog
          open={newOpen}
          initialValue={value.type === "NEW" ? value.draft : undefined}
          onOpenChange={setNewOpen}
          onConfirm={(draft) => onChange({ type: "NEW", draft })}
        />
      </>
    )
  }

  return (
    <>
      <div
        data-invalid={invalid || undefined}
        className="grid gap-2 rounded-lg border border-dashed p-3 data-invalid:border-destructive sm:grid-cols-2"
      >
        <Button type="button" variant="outline" onClick={() => setSelectOpen(true)}>
          <SearchIcon />
          Select existing user
        </Button>
        <Button type="button" variant="outline" onClick={() => setNewOpen(true)}>
          <UserPlusIcon />
          Create new user
        </Button>
      </div>

      <SelectOwnerDialog
        open={selectOpen}
        onOpenChange={setSelectOpen}
        onSelect={(account) => onChange({ type: "EXISTING", account })}
      />
      <NewOwnerDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onConfirm={(draft) => onChange({ type: "NEW", draft })}
      />
    </>
  )
}

/** Icon re-exported for the empty-state button in consuming forms. */
export { PlusIcon as OwnerAddIcon }
