import { Checkbox } from "@/components/ui/checkbox"
import { NO_ROLES_SELECTED_NOTE } from "../lib/member-display"
import type { AssignableRole } from "../types/members.types"

type RoleSelectorProps = {
  roles: AssignableRole[]
  selected: string[]
  onChange: (roleKeys: string[]) => void
  isLoading?: boolean
  disabled?: boolean
}

/**
 * Picks zero, one or many roles.
 *
 * Zero is a legitimate choice, not a validation failure, so nothing here forces
 * a selection — the note below simply states what it means. Only the role name
 * and description are shown; `systemKey`, ids and scope are backend concerns and
 * are never exposed by the API in the first place.
 */
export function RoleSelector({
  roles,
  selected,
  onChange,
  isLoading,
  disabled,
}: RoleSelectorProps) {
  const toggle = (key: string, checked: boolean) => {
    onChange(checked ? [...selected, key] : selected.filter((k) => k !== key))
  }

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading roles…</p>
  }

  if (roles.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No roles are available in this agency yet.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-44 overflow-y-auto rounded-lg border p-1">
        {roles.map((role) => {
          const checked = selected.includes(role.key)
          return (
            <label
              key={role.key}
              className="flex cursor-pointer items-start gap-2.5 rounded-md p-2 hover:bg-muted"
            >
              <Checkbox
                checked={checked}
                disabled={disabled}
                onCheckedChange={(value) => toggle(role.key, value === true)}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{role.name}</span>
                {role.description ? (
                  <span className="block text-xs text-muted-foreground">
                    {role.description}
                  </span>
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
      {selected.length === 0 ? (
        <p className="text-xs text-muted-foreground">{NO_ROLES_SELECTED_NOTE}</p>
      ) : null}
    </div>
  )
}
