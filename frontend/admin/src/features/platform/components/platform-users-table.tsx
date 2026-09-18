import {
  BanIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  ShieldIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "../lib/format"
import { userDisplayName, userRolesLabel } from "../lib/platform-user"
import type {
  PlatformUser,
  PlatformUserStatus,
} from "../types/platform-user.types"

export type PlatformUsersTableProps = {
  users: PlatformUser[]
  onEdit: (user: PlatformUser) => void
  onManageRoles: (user: PlatformUser) => void
  onSetStatus: (user: PlatformUser, status: PlatformUserStatus) => void
}

function StatusBadge({ status }: { status: PlatformUserStatus }) {
  if (status === "SUSPENDED") {
    return <Badge variant="destructive">Suspended</Badge>
  }
  return <Badge variant="secondary">Active</Badge>
}

function UserActions({
  user,
  onEdit,
  onManageRoles,
  onSetStatus,
}: {
  user: PlatformUser
  onEdit: PlatformUsersTableProps["onEdit"]
  onManageRoles: PlatformUsersTableProps["onManageRoles"]
  onSetStatus: PlatformUsersTableProps["onSetStatus"]
}) {
  const suspended = user.status === "SUSPENDED"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <MoreHorizontalIcon />
        <span className="sr-only">Open actions for {userDisplayName(user)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(user)}>
          <PencilIcon />
          Edit user
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onManageRoles(user)}>
          <ShieldIcon />
          Manage roles
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant={suspended ? undefined : "destructive"}
          onClick={() => onSetStatus(user, suspended ? "ACTIVE" : "SUSPENDED")}
        >
          {suspended ? <RotateCcwIcon /> : <BanIcon />}
          {suspended ? "Reactivate user" : "Suspend user"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PlatformUsersTable({
  users,
  onEdit,
  onManageRoles,
  onSetStatus,
}: PlatformUsersTableProps) {
  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead className="hidden md:table-cell">Code</TableHead>
            <TableHead className="hidden lg:table-cell">Platform roles</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden xl:table-cell">Created</TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.code}>
              <TableCell className="font-medium">
                <span className="block">{userDisplayName(user)}</span>
                <span className="mt-0.5 block max-w-xs truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="font-mono text-xs text-muted-foreground">
                  {user.code}
                </span>
              </TableCell>
              <TableCell className="hidden max-w-md truncate text-muted-foreground lg:table-cell">
                {userRolesLabel(user)}
              </TableCell>
              <TableCell>
                <StatusBadge status={user.status} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground xl:table-cell">
                {formatDate(user.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <UserActions
                  user={user}
                  onEdit={onEdit}
                  onManageRoles={onManageRoles}
                  onSetStatus={onSetStatus}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}