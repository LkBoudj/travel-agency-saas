import { useMemo, useState } from "react"
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
import { useAvailablePermissions } from "../hooks/use-available-permissions"
import { useReplaceRolePermissions } from "../hooks/use-replace-role-permissions"
import { useRolePermissions } from "../hooks/use-role-permissions"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import { getRbacErrorMessage } from "../lib/rbac-errors"
import {
  arePermissionKeysEqual,
  countSelectedInGroup,
  groupPermissionsByResource,
  togglePermissionKey,
  type PermissionGroup,
} from "../lib/permission-catalog"
import type { PlatformRole, RoleScope } from "../types/rbac.types"

export type RolePermissionsSheetProps = {
  role: PlatformRole
  open: boolean
  onOpenChange: (open: boolean) => void
}

function PermissionGroupSection({
  group,
  selectedKeys,
  disabled,
  onToggle,
}: {
  group: PermissionGroup
  selectedKeys: string[]
  disabled: boolean
  onToggle: (key: string, checked: boolean) => void
}) {
  const selectedCount = countSelectedInGroup(group, selectedKeys)

  return (
    <section
      aria-labelledby={`permission-group-${group.resource}`}
      className="flex flex-col gap-2"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3
          id={`permission-group-${group.resource}`}
          className="text-sm font-medium"
        >
          {group.label}
        </h3>
        <span className="text-xs text-muted-foreground">
          {selectedCount}/{group.permissions.length}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {group.permissions.map((permission) => {
          const checkboxId = `permission-${permission.key}`
          const checked = selectedKeys.includes(permission.key)
          const showDescription =
            !!permission.description && permission.description !== permission.name

          return (
            <li key={permission.key} className="flex items-start gap-3">
              <Checkbox
                id={checkboxId}
                className="mt-0.5"
                checked={checked}
                disabled={disabled}
                onCheckedChange={(value) => onToggle(permission.key, value === true)}
              />
              <div className="grid gap-0.5">
                <Label htmlFor={checkboxId} className="font-medium">
                  {permission.name}
                </Label>
                {showDescription ? (
                  <p className="text-sm text-muted-foreground">
                    {permission.description}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function PermissionsSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-4">
      {[0, 1].map((group) => (
        <div key={group} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      ))}
    </div>
  )
}

function PermissionEditor({
  scope,
  role,
  groups,
  totalPermissions,
  initialKeys,
}: {
  scope: RoleScope
  role: PlatformRole
  groups: PermissionGroup[]
  totalPermissions: number
  initialKeys: string[]
}) {
  const replaceMutation = useReplaceRolePermissions(scope, role.id)
  const redirectOnSessionExpiry = useSessionExpiryRedirect()
  const [selectedKeys, setSelectedKeys] = useState(initialKeys)
  const [savedKeys, setSavedKeys] = useState(initialKeys)

  const isDirty = !arePermissionKeysEqual(selectedKeys, savedKeys)
  const errorMessage = replaceMutation.isError
    ? getRbacErrorMessage("replace-permissions", replaceMutation.error)
    : undefined

  const handleSave = () => {
    replaceMutation.mutate(selectedKeys, {
      onError: (error) => redirectOnSessionExpiry(error),
      onSuccess: (result) => {
        setSelectedKeys(result.permissionKeys)
        setSavedKeys(result.permissionKeys)
        toast.success("Permissions saved.")
      },
    })
  }

  return (
    <>
      <SheetBody>
        <div className="flex flex-col gap-6 pb-2">
          {groups.map((group) => (
            <PermissionGroupSection
              key={group.resource}
              group={group}
              selectedKeys={selectedKeys}
              disabled={replaceMutation.isPending}
              onToggle={(key, checked) => {
                setSelectedKeys((previous) =>
                  togglePermissionKey(previous, key, checked)
                )
              }}
            />
          ))}
        </div>
      </SheetBody>

      <SheetFooter>
        {errorMessage ? (
          <p role="alert" className="text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {selectedKeys.length} of {totalPermissions} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!isDirty || replaceMutation.isPending}
              onClick={() => {
                setSelectedKeys(savedKeys)
              }}
            >
              <RotateCcwIcon />
              Reset
            </Button>
            <Button
              size="sm"
              disabled={!isDirty || replaceMutation.isPending}
              onClick={handleSave}
            >
              {replaceMutation.isPending ? (
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

export function RolePermissionsSheet({
  role,
  open,
  onOpenChange,
}: RolePermissionsSheetProps) {
  const scope = role.scope
  const permissionsQuery = useAvailablePermissions(scope)
  const rolePermissionsQuery = useRolePermissions(scope, role.id, open)

  const groups = useMemo(
    () => groupPermissionsByResource(permissionsQuery.data ?? []),
    [permissionsQuery.data]
  )

  const totalPermissions = permissionsQuery.data?.length ?? 0
  const isLoading = permissionsQuery.isPending || rolePermissionsQuery.isPending
  const isError = permissionsQuery.isError || rolePermissionsQuery.isError
  const serverKeys = rolePermissionsQuery.data
  const scopeLabel = scope === "PLATFORM" ? "platform" : "agency"

  const handleRetry = () => {
    void permissionsQuery.refetch()
    void rolePermissionsQuery.refetch()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 data-[side=right]:sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle>Manage permissions</SheetTitle>
          <SheetDescription>
            Choose the {scopeLabel} permissions granted to{" "}
            <span className="font-medium text-foreground">{role.name}</span>.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <SheetBody>
            <PermissionsSkeleton />
          </SheetBody>
        ) : null}

        {!isLoading && isError ? (
          <SheetBody className="flex flex-col items-start gap-3">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <CircleAlertIcon className="size-4" />
              Could not load the permission catalog.
            </p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RotateCcwIcon />
              Retry
            </Button>
          </SheetBody>
        ) : null}

        {!isLoading && !isError && totalPermissions === 0 ? (
          <SheetBody>
            <p className="text-sm text-muted-foreground">
              {scope === "PLATFORM"
                ? "No platform permissions are available."
                : "No agency permissions are available yet."}
            </p>
          </SheetBody>
        ) : null}

        {!isLoading && !isError && totalPermissions > 0 && serverKeys ? (
          <PermissionEditor
            scope={scope}
            role={role}
            groups={groups}
            totalPermissions={totalPermissions}
            initialKeys={serverKeys}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
