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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast-manager"
import { ApiError } from "@/lib/api"
import { DeleteRoleDialog } from "../components/delete-role-dialog"
import { RoleFormDialog } from "../components/role-form-dialog"
import { RolePermissionsSheet } from "../components/role-permissions-sheet"
import { RolesTable } from "../components/roles-table"
import { useRoles } from "../hooks/use-roles"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import type { PlatformRole, RoleScope } from "../types/rbac.types"

type RoleFormState =
  | { mode: "create"; scope: RoleScope }
  | { mode: "edit"; role: PlatformRole }

const SCOPE_META: Record<
  RoleScope,
  { heading: string; description: string; emptyTitle: string; emptyBody: string }
> = {
  PLATFORM: {
    heading: "Platform roles",
    description: "Roles that grant permissions to platform users.",
    emptyTitle: "No platform roles yet",
    emptyBody: "Create the first role to start assigning platform permissions.",
  },
  AGENCY: {
    heading: "Agency roles",
    description: "Roles that grant permissions to agency users.",
    emptyTitle: "No agency roles yet",
    emptyBody: "Create an agency role to define what agency users can do.",
  },
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

function ScopeRolesPanel({
  scope,
  onCreate,
  onEdit,
  onManagePermissions,
  onDelete,
}: {
  scope: RoleScope
  onCreate: (scope: RoleScope) => void
  onEdit: (role: PlatformRole) => void
  onManagePermissions: (role: PlatformRole) => void
  onDelete: (role: PlatformRole) => void
}) {
  const rolesQuery = useRoles(scope)
  const redirectOnSessionExpiry = useSessionExpiryRedirect()
  const meta = SCOPE_META[scope]

  useEffect(() => {
    if (rolesQuery.error instanceof ApiError && rolesQuery.error.status === 401) {
      redirectOnSessionExpiry(rolesQuery.error)
    }
  }, [rolesQuery.error, redirectOnSessionExpiry])

  const roles = rolesQuery.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-base font-medium">{meta.heading}</h2>
          <p className="text-sm text-muted-foreground">{meta.description}</p>
        </div>
        <Button onClick={() => onCreate(scope)}>
          <PlusIcon />
          Create role
        </Button>
      </div>

      {rolesQuery.isPending ? <RolesLoading /> : null}

      {!rolesQuery.isPending && rolesQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <CircleAlertIcon className="size-4" />
              Could not load {meta.heading.toLowerCase()}. Please try again.
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
      ) : null}

      {!rolesQuery.isPending && !rolesQuery.isError && roles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ShieldIcon className="size-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">{meta.emptyTitle}</p>
              <p className="text-sm text-muted-foreground">{meta.emptyBody}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!rolesQuery.isPending && !rolesQuery.isError && roles.length > 0 ? (
        <RolesTable
          roles={roles}
          onEdit={onEdit}
          onManagePermissions={onManagePermissions}
          onDelete={onDelete}
        />
      ) : null}
    </div>
  )
}

export function RolesPermissionsPage() {
  const [scope, setScope] = useState<RoleScope>("PLATFORM")
  const [formState, setFormState] = useState<RoleFormState | null>(null)
  const [permissionsRole, setPermissionsRole] = useState<PlatformRole | null>(
    null
  )
  const [deleteTarget, setDeleteTarget] = useState<PlatformRole | null>(null)

  const openCreate = (targetScope: RoleScope) =>
    setFormState({ mode: "create", scope: targetScope })
  const openEdit = (role: PlatformRole) => setFormState({ mode: "edit", role })

  const formScope =
    formState?.mode === "edit" ? formState.role.scope : formState?.scope
  const formRole = formState?.mode === "edit" ? formState.role : undefined

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Roles &amp; Permissions
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage platform and agency roles and the permissions granted to them.
        </p>
      </header>

      <Tabs
        value={scope}
        onValueChange={(value) => {
          if (value === "PLATFORM" || value === "AGENCY") {
            setScope(value)
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="PLATFORM">Platform Roles</TabsTrigger>
          <TabsTrigger value="AGENCY">Agency Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="PLATFORM">
          <ScopeRolesPanel
            scope="PLATFORM"
            onCreate={openCreate}
            onEdit={openEdit}
            onManagePermissions={setPermissionsRole}
            onDelete={setDeleteTarget}
          />
        </TabsContent>
        <TabsContent value="AGENCY">
          <ScopeRolesPanel
            scope="AGENCY"
            onCreate={openCreate}
            onEdit={openEdit}
            onManagePermissions={setPermissionsRole}
            onDelete={setDeleteTarget}
          />
        </TabsContent>
      </Tabs>

      {formState && formScope ? (
        <RoleFormDialog
          mode={formState.mode}
          scope={formScope}
          role={formRole}
          open
          onSuccess={(message, role) => {
            toast.success(message)
            if (formState.mode === "create") {
              setPermissionsRole(role)
            }
          }}
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
          onSuccess={(message) => toast.success(message)}
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
