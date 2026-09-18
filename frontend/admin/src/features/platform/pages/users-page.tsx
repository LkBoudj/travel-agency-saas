import { useEffect, useState } from "react"
import {
  CircleAlertIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast-manager"
import { ApiError } from "@/lib/api"
import { CreateUserDialog } from "../components/create-user-dialog"
import { EditUserDialog } from "../components/edit-user-dialog"
import { ManageRolesSheet } from "../components/manage-roles-sheet"
import { PlatformUsersTable } from "../components/platform-users-table"
import { SetUserStatusDialog } from "../components/set-user-status-dialog"
import { usePlatformUsers } from "../hooks/use-platform-users"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import type {
  PlatformUser,
  PlatformUserStatus,
} from "../types/platform-user.types"

function UsersLoading() {
  return (
    <Card className="overflow-hidden py-0">
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-4 w-28" />
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
        ))}
      </div>
    </Card>
  )
}

export function UsersPage() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<PlatformUser | null>(null)
  const [rolesUser, setRolesUser] = useState<PlatformUser | null>(null)
  const [statusTarget, setStatusTarget] = useState<{
    user: PlatformUser
    status: PlatformUserStatus
  } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const usersQuery = usePlatformUsers(search)
  const redirectOnSessionExpiry = useSessionExpiryRedirect()

  useEffect(() => {
    if (usersQuery.error instanceof ApiError && usersQuery.error.status === 401) {
      redirectOnSessionExpiry(usersQuery.error)
    }
  }, [usersQuery.error, redirectOnSessionExpiry])

  const users = usersQuery.data ?? []
  const searching = search.trim().length > 0

  const handleStatus = (user: PlatformUser, status: PlatformUserStatus) => {
    setStatusTarget({ user, status })
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Accounts that can sign in to the Super Dashboard, and their roles.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          Create user
        </Button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <label htmlFor="users-search" className="sr-only">
            Search users
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="users-search"
            type="search"
            placeholder="Search by name, email or code"
            className="pl-8 md:w-72"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
      </div>

      {usersQuery.isPending ? <UsersLoading /> : null}

      {!usersQuery.isPending && usersQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <CircleAlertIcon className="size-4" />
              Could not load platform users. Please try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void usersQuery.refetch()}
            >
              <RefreshCwIcon />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!usersQuery.isPending && !usersQuery.isError && users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <UsersIcon className="size-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">
                {searching ? "No users match your search" : "No platform users yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {searching
                  ? "Try a different name, email or code."
                  : "Create the first user to start granting Super Dashboard access."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!usersQuery.isPending && !usersQuery.isError && users.length > 0 ? (
        <PlatformUsersTable
          users={users}
          onEdit={setEditUser}
          onManageRoles={setRolesUser}
          onSetStatus={handleStatus}
        />
      ) : null}

      <CreateUserDialog
        open={createOpen}
        onSuccess={(message) => toast.success(message)}
        onOpenChange={setCreateOpen}
      />

      {editUser ? (
        <EditUserDialog
          user={editUser}
          open
          onSuccess={(message) => toast.success(message)}
          onOpenChange={(open) => {
            if (!open) {
              setEditUser(null)
            }
          }}
        />
      ) : null}

      {rolesUser ? (
        <ManageRolesSheet
          user={rolesUser}
          open
          onOpenChange={(open) => {
            if (!open) {
              setRolesUser(null)
            }
          }}
        />
      ) : null}

      {statusTarget ? (
        <SetUserStatusDialog
          user={statusTarget.user}
          status={statusTarget.status}
          open
          onSuccess={(message) => toast.success(message)}
          onOpenChange={(open) => {
            if (!open) {
              setStatusTarget(null)
            }
          }}
        />
      ) : null}
    </div>
  )
}