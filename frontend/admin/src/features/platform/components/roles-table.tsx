import {
  MoreHorizontalIcon,
  PencilIcon,
  ShieldIcon,
  Trash2Icon,
} from "lucide-react"

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
import type { PlatformRole } from "../types/rbac.types"

export type RolesTableProps = {
  roles: PlatformRole[]
  onEdit: (role: PlatformRole) => void
  onManagePermissions: (role: PlatformRole) => void
  onDelete: (role: PlatformRole) => void
}

function RoleActions({
  role,
  onEdit,
  onManagePermissions,
  onDelete,
}: {
  role: PlatformRole
} & Omit<RolesTableProps, "roles">) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" />}
      >
        <MoreHorizontalIcon />
        <span className="sr-only">Open actions for {role.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(role)}>
          <PencilIcon />
          Edit role
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onManagePermissions(role)}>
          <ShieldIcon />
          Manage permissions
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(role)}>
          <Trash2Icon />
          Delete role
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function RolesTable({
  roles,
  onEdit,
  onManagePermissions,
  onDelete,
}: RolesTableProps) {
  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead className="hidden md:table-cell">Key</TableHead>
            <TableHead className="hidden lg:table-cell">Description</TableHead>
            <TableHead className="hidden xl:table-cell">Updated</TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell className="font-medium">
                <span className="block">{role.name}</span>
                <span className="mt-0.5 block max-w-xs truncate text-xs font-normal text-muted-foreground md:hidden">
                  <span className="font-mono">{role.key}</span>
                  {role.description ? ` · ${role.description}` : ""}
                </span>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="font-mono text-xs text-muted-foreground">
                  {role.key}
                </span>
              </TableCell>
              <TableCell className="hidden max-w-md whitespace-normal text-muted-foreground lg:table-cell">
                {role.description ?? (
                  <span className="italic">No description</span>
                )}
              </TableCell>
              <TableCell className="hidden text-muted-foreground xl:table-cell">
                {formatDate(role.updatedAt)}
              </TableCell>
              <TableCell className="text-right">
                <RoleActions
                  role={role}
                  onEdit={onEdit}
                  onManagePermissions={onManagePermissions}
                  onDelete={onDelete}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
