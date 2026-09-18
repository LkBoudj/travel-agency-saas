import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeftIcon,
  BanIcon,
  CircleAlertIcon,
  PencilIcon,
  RefreshCwIcon,
  RotateCcwIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast-manager"
import { ApiError } from "@/lib/api"
import { ROUTES } from "@/app/router/route-paths"
import { AgencyStatusBadge } from "../components/agencies-table"
import { EditAgencyDialog } from "../components/edit-agency-dialog"
import { SetAgencyStatusDialog } from "../components/set-agency-status-dialog"
import { useAgency } from "../hooks/use-agency"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import { getAgencyErrorMessage } from "../lib/agency-errors"
import { formatDate } from "../lib/format"
import {
  NO_OWNER_LABEL,
  nextAgencyStatus,
  optionalText,
  ownerDisplayName,
  ownerSecondaryLine,
} from "../lib/agency"
import type { AgencyDetails, AgencyStatus } from "../types/agency.types"

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm sm:col-span-2">{children}</dd>
    </div>
  )
}

function DetailsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-64" />
      <Card>
        <CardContent className="flex flex-col gap-4 py-6">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-center gap-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Agency overview.
 *
 * Only fields the backend actually returns are rendered. Members and Customers
 * tabs are deliberately absent: member management does not exist yet and the
 * platform has no customer model at all, so no empty tab is shown to imply
 * otherwise.
 */
export function AgencyDetailsPage() {
  const { code = "" } = useParams<{ code: string }>()
  const agencyQuery = useAgency(code)
  const redirectOnSessionExpiry = useSessionExpiryRedirect()

  const [editOpen, setEditOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<AgencyStatus | null>(null)

  useEffect(() => {
    if (
      agencyQuery.error instanceof ApiError &&
      agencyQuery.error.status === 401
    ) {
      redirectOnSessionExpiry(agencyQuery.error)
    }
  }, [agencyQuery.error, redirectOnSessionExpiry])

  const backLink = (
    <Button variant="ghost" size="sm" render={<Link to={ROUTES.agencies} />}>
      <ArrowLeftIcon />
      All agencies
    </Button>
  )

  if (agencyQuery.isPending) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        {backLink}
        <DetailsLoading />
      </div>
    )
  }

  if (agencyQuery.isError) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        {backLink}
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <CircleAlertIcon className="size-4" />
              {getAgencyErrorMessage("load-agency", agencyQuery.error)}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void agencyQuery.refetch()}
            >
              <RefreshCwIcon />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const agency: AgencyDetails = agencyQuery.data
  const suspended = agency.status === "SUSPENDED"

  return (
    <div className="flex flex-1 flex-col gap-6">
      {backLink}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {agency.name}
            </h1>
            <AgencyStatusBadge status={agency.status} />
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {agency.code}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <PencilIcon />
            Edit agency
          </Button>
          <Button
            variant={suspended ? "outline" : "destructive"}
            onClick={() => setStatusTarget(nextAgencyStatus(agency.status))}
          >
            {suspended ? <RotateCcwIcon /> : <BanIcon />}
            {suspended ? "Reactivate agency" : "Suspend agency"}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overview</CardTitle>
          <CardDescription>
            Agency profile and ownership as recorded by the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="-my-3">
            <DetailRow label="Name">{agency.name}</DetailRow>
            <DetailRow label="Agency code">
              <span className="font-mono text-xs">{agency.code}</span>
            </DetailRow>
            <DetailRow label="Status">
              <AgencyStatusBadge status={agency.status} />
            </DetailRow>
            <DetailRow label="Owner">
              {agency.owner ? (
                <div className="space-y-0.5">
                  <p>{ownerDisplayName(agency.owner)}</p>
                  {ownerSecondaryLine(agency.owner) ? (
                    <p className="text-xs text-muted-foreground">
                      {ownerSecondaryLine(agency.owner)}
                    </p>
                  ) : null}
                  <p className="font-mono text-xs text-muted-foreground">
                    {agency.owner.code}
                  </p>
                </div>
              ) : (
                <span className="text-muted-foreground">{NO_OWNER_LABEL}</span>
              )}
            </DetailRow>
            <DetailRow label="Members">
              <span className="tabular-nums">{agency.membersCount}</span>
            </DetailRow>
            <DetailRow label="Country">{optionalText(agency.country)}</DetailRow>
            <DetailRow label="Description">
              <span className="whitespace-pre-line">
                {optionalText(agency.description)}
              </span>
            </DetailRow>
            <DetailRow label="Created">{formatDate(agency.createdAt)}</DetailRow>
            <DetailRow label="Last updated">
              {formatDate(agency.updatedAt)}
            </DetailRow>
          </dl>
        </CardContent>
      </Card>

      <EditAgencyDialog
        agency={agency}
        open={editOpen}
        onSuccess={(message) => toast.success(message)}
        onOpenChange={setEditOpen}
      />

      {statusTarget ? (
        <SetAgencyStatusDialog
          agency={agency}
          status={statusTarget}
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
