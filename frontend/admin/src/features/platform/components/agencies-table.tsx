import { Link } from "react-router-dom"
import {
  BanIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
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
import { agencyDetailsPath } from "@/app/router/route-paths"
import { formatDate } from "../lib/format"
import {
  NO_OWNER_LABEL,
  agencyActionsLabel,
  agencyStatusLabel,
  nextAgencyStatus,
  ownerDisplayName,
  ownerSecondaryLine,
} from "../lib/agency"
import type { Agency, AgencyStatus } from "../types/agency.types"

export type AgenciesTableProps = {
  agencies: Agency[]
  onEdit: (agency: Agency) => void
  onSetStatus: (agency: Agency, status: AgencyStatus) => void
}

export function AgencyStatusBadge({ status }: { status: AgencyStatus }) {
  if (status === "SUSPENDED") {
    return <Badge variant="destructive">{agencyStatusLabel(status)}</Badge>
  }
  return <Badge variant="secondary">{agencyStatusLabel(status)}</Badge>
}

/**
 * Owner cell. The owner is rendered as plain text, not a link: the platform has
 * no AppUser details route that covers agency owners yet (Platform Users only
 * serves accounts holding a platform role), and a link to a page that would 404
 * is worse than no link. The owner code stays available in the data for the
 * future unified user details slice.
 */
function OwnerCell({ agency }: { agency: Agency }) {
  if (!agency.owner) {
    return <span className="text-muted-foreground">{NO_OWNER_LABEL}</span>
  }

  const secondary = ownerSecondaryLine(agency.owner)
  return (
    <>
      <span className="block">{ownerDisplayName(agency.owner)}</span>
      {secondary ? (
        <span className="mt-0.5 block max-w-xs truncate text-xs text-muted-foreground">
          {secondary}
        </span>
      ) : null}
    </>
  )
}

function AgencyActions({
  agency,
  onEdit,
  onSetStatus,
}: {
  agency: Agency
  onEdit: AgenciesTableProps["onEdit"]
  onSetStatus: AgenciesTableProps["onSetStatus"]
}) {
  const suspended = agency.status === "SUSPENDED"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <MoreHorizontalIcon />
        <span className="sr-only">{agencyActionsLabel(agency)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem render={<Link to={agencyDetailsPath(agency.code)} />}>
          <EyeIcon />
          View agency
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEdit(agency)}>
          <PencilIcon />
          Edit agency
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant={suspended ? undefined : "destructive"}
          onClick={() => onSetStatus(agency, nextAgencyStatus(agency.status))}
        >
          {suspended ? <RotateCcwIcon /> : <BanIcon />}
          {suspended ? "Reactivate agency" : "Suspend agency"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AgenciesTable({
  agencies,
  onEdit,
  onSetStatus,
}: AgenciesTableProps) {
  return (
    <Card className="overflow-hidden py-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agency</TableHead>
            <TableHead className="hidden lg:table-cell">Owner</TableHead>
            <TableHead className="hidden sm:table-cell">Members</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden xl:table-cell">Created</TableHead>
            <TableHead className="w-12 text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agencies.map((agency) => (
            <TableRow key={agency.code}>
              <TableCell className="font-medium">
                <Link
                  to={agencyDetailsPath(agency.code)}
                  className="block hover:underline"
                >
                  {agency.name}
                </Link>
                <span className="mt-0.5 block font-mono text-xs font-normal text-muted-foreground">
                  {agency.code}
                </span>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <OwnerCell agency={agency} />
              </TableCell>
              <TableCell className="hidden tabular-nums sm:table-cell">
                {agency.membersCount}
              </TableCell>
              <TableCell>
                <AgencyStatusBadge status={agency.status} />
              </TableCell>
              <TableCell className="hidden text-muted-foreground xl:table-cell">
                {formatDate(agency.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                <AgencyActions
                  agency={agency}
                  onEdit={onEdit}
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
