import { useState } from "react"
import {
  CircleAlertIcon,
  Loader2Icon,
  RotateCcwIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetBody,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast-manager"
import { useRoles } from "../hooks/use-roles"
import { useReplacePlatformUserRoles } from "../hooks/use-replace-platform-user-roles"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import { getPlatformUserErrorMessage } from "../lib/platform-user-errors"
import { userDisplayName } from "../lib/platform-user"
import type { PlatformRole } from "../types/rbac.types"
import type { PlatformUser } from "../types/platform-user.types"

export type ManageRolesSheetProps = {
  user: PlatformUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

function RolesSkeleton() {
  return (
    <div className="flex flex-col gap-3 pb-4">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-start gap-3">
          <Skeleton className="mt-0.5 size-4 rounded" />
          <div className="flex flex-1 flex-col gap-1">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}

function RoleChecklist({
  roles,
  selectedKeys,
  disabled,
  onToggle,
}: {
  roles: PlatformRole[]
  selectedKeys: string[]
  disabled: boolean
  onToggle: (key: string, checked: boolean) => void
}) {
  return (
    <ul className="flex flex-col gap-3">
      {roles.map((role) => {
        const checkboxId = `manage-role-${role.key}`
        const checked = selectedKeys.includes(role.key)
        return (
          <li key={role.id} className="flex items-start gap-3">
            <Checkbox
              id={checkboxId}
              className="mt-0.5"
              checked={checked}
              disabled={disabled}
              onCheckedChange={(value) => onToggle(role.key, value === true)}
            />
            <div className="grid gap-0.5">
              <Label htmlFor={checkboxId} className="font-medium">
                {role.name}
              </Label>
              <p className="font-mono text-xs text-muted-foreground">
                {role.key}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function RoleEditor({
  user,
  roles,
}: {
  user: PlatformUser
  roles: PlatformRole[]
}) {
  const replaceRoles = useReplacePlatformUserRoles(user.code)
  const redirectOnSessionExpiry = useSessionExpiryRedirect()
  const [selectedKeys, setSelectedKeys] = useState(
    user.roles.map((role) => role.key)
  )
  const [savedKeys, setSavedKeys] = useState(user.roles.map((role) => role.key))

  const isDirty =
    selectedKeys.length !== savedKeys.length ||
    selectedKeys.some((key) => !savedKeys.includes(key))

  const errorMessage = replaceRoles.isError
    ? getPlatformUserErrorMessage("replace-roles", replaceRoles.error)
    : undefined

  const handleSave = () => {
    replaceRoles.mutate(selectedKeys, {
      onError: (error) => redirectOnSessionExpiry(error),
      onSuccess: (result) => {
        const keys = result.roles.map((role) => role.key)
        setSelectedKeys(keys)
        setSavedKeys(keys)
        toast.success("Roles updated.")
      },
    })
  }

  return (
    <>
      <SheetBody>
        <RoleChecklist
          roles={roles}
          selectedKeys={selectedKeys}
          disabled={replaceRoles.isPending}
          onToggle={(key, checked) => {
            setSelectedKeys((previous) =>
              checked
                ? [...previous, key]
                : previous.filter((previousKey) => previousKey !== key)
            )
          }}
        />
      </SheetBody>

      <SheetFooter>
        {errorMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {selectedKeys.length} of {roles.length} roles
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!isDirty || replaceRoles.isPending}
              onClick={() => {
                setSelectedKeys(savedKeys)
              }}
            >
              <RotateCcwIcon />
              Reset
            </Button>
            <Button
              size="sm"
              disabled={!isDirty || replaceRoles.isPending}
              onClick={handleSave}
            >
              {replaceRoles.isPending ? (
                <Loader2Icon className="animate-spin" />
              ) : null}
              Save changes
            </Button>
          </div>
        </div>
      </SheetFooter>
    </>
  )
}

export function ManageRolesSheet({
  user,
  open,
  onOpenChange,
}: ManageRolesSheetProps) {
  const rolesQuery = useRoles("PLATFORM")
  const roles = rolesQuery.data ?? []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 data-[side=right]:sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>Manage roles</SheetTitle>
          <SheetDescription>
            Choose the platform roles assigned to{" "}
            <span className="font-medium text-foreground">
              {userDisplayName(user)}
            </span>
            .
          </SheetDescription>
        </SheetHeader>

        {rolesQuery.isPending ? (
          <SheetBody>
            <RolesSkeleton />
          </SheetBody>
        ) : null}

        {!rolesQuery.isPending && rolesQuery.isError ? (
          <SheetBody className="flex flex-col items-start gap-3">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <CircleAlertIcon className="size-4" />
              Could not load the role catalog.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void rolesQuery.refetch()}
            >
              <RotateCcwIcon />
              Retry
            </Button>
          </SheetBody>
        ) : null}

        {!rolesQuery.isPending && !rolesQuery.isError && roles.length === 0 ? (
          <SheetBody>
            <p className="text-sm text-muted-foreground">
              No platform roles are available.
            </p>
          </SheetBody>
        ) : null}

        {!rolesQuery.isPending && !rolesQuery.isError && roles.length > 0 ? (
          <RoleEditor user={user} roles={roles} />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}