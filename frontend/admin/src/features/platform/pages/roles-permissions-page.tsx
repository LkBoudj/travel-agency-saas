import { useEffect, useState } from "react"
import {
  CircleAlertIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api"
import { DeleteRoleDialog } from "../components/delete-role-dialog"
import { RoleFormDialog } from "../components/role-form-dialog"
import { RolePermissionsSheet } from "../components/role-permissions-sheet"
import { RolesTable } from "../components/roles-table"
import { useRoles } from "../hooks/use-roles"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import type { PlatformRole } from "../types/rbac.types"

type RoleFormState = {
  mode: "create" | "edit"
  role?: PlatformRole
}

function RolesLoading() {
  return (
    <Card className="overflow-hidden py-0">
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-4 w-24" />
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
        ))}
      </div>
    </Card>
  )
}

export function RolesPermissionsPage() {
  const rolesQuery = useRoles()
  const redirectOnSessionExpiry = useSessionExpiryRedirect()
  const [formState, setFormState] = useState<RoleFormState | null>(null)
  const [permissionsRole, setPermissionsRole] = useState<PlatformRole | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PlatformRole | null>(null)

  useEffect(() => {
    if (rolesQuery.error instanceof ApiError && rolesQuery.error.status === 401) {
      redirectOnSessionExpiry(rolesQuery.error)
    }
  }, [rolesQuery.error, redirectOnSessionExpiry])

  const roles = rolesQuery.data ?? []

  const loadErrorMessage = rolesQuery.isError
    ? "Could not load platform roles. Please try again."
    : undefined

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Roles &amp; Permissions
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage platform roles and the permissions granted to them.
          </p>
        </div>
        <Button onClick={() => setFormState({ mode: "create" })}>
          <PlusIcon />
          Create role
        </Button>
      </header>

      {rolesQuery.isPending ? (
        <RolesLoading />
      ) : rolesQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <CircleAlertIcon className="size-4" />
              {loadErrorMessage}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void rolesQuery.refetch()}
            >
              <RefreshCwIcon />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : roles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ShieldIcon className="size-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">No platform roles yet</p>
              <p className="text-sm text-muted-foreground">
                Create the first role to start assigning platform permissions.
              </p>
            </div>
            <Button onClick={() => setFormState({ mode: "create" })}>
              <PlusIcon />
              Create role
            </Button>
          </CardContent>
        </Card>
      ) : (
        <RolesTable
          roles={roles}
          onEdit={(role) => setFormState({ mode: "edit", role })}
          onManagePermissions={setPermissionsRole}
          onDelete={setDeleteTarget}
        />
      )}

      {formState ? (
        <RoleFormDialog
          mode={formState.mode}
          role={formState.role}
          open
          onOpenChange={(open) => {
            if (!open) {
              setFormState(null)
            }
          }}
        />
      ) : null}

      {permissionsRole ? (
        <RolePermissionsSheet
          role={permissionsRole}
          open
          onOpenChange={(open) => {
            if (!open) {
              setPermissionsRole(null)
            }
          }}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteRoleDialog
          role={deleteTarget}
          open
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null)
            }
          }}
        />
      ) : null}
    </div>
  )
}
