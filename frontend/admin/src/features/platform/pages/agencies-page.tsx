import { useEffect, useState } from "react"
import {
  BuildingIcon,
  CircleAlertIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast-manager"
import { ApiError } from "@/lib/api"
import { AgenciesTable } from "../components/agencies-table"
import { CreateAgencyDialog } from "../components/create-agency-dialog"
import { EditAgencyDialog } from "../components/edit-agency-dialog"
import { SetAgencyStatusDialog } from "../components/set-agency-status-dialog"
import { useAgencies } from "../hooks/use-agencies"
import { useSessionExpiryRedirect } from "../hooks/use-session-expiry-redirect"
import { getAgencyErrorMessage } from "../lib/agency-errors"
import { isFiltered } from "../lib/agency"
import type { Agency, AgencyStatus } from "../types/agency.types"

type StatusFilter = AgencyStatus | "ALL"

function AgenciesLoading() {
  return (
    <Card className="overflow-hidden py-0">
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-4 w-28" />
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-4">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
        ))}
      </div>
    </Card>
  )
}

export function AgenciesPage() {
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")
  const [createOpen, setCreateOpen] = useState(false)
  const [editAgency, setEditAgency] = useState<Agency | null>(null)
  const [statusTarget, setStatusTarget] = useState<{
    agency: Agency
    status: AgencyStatus
  } | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const agenciesQuery = useAgencies(search, statusFilter)
  const redirectOnSessionExpiry = useSessionExpiryRedirect()

  useEffect(() => {
    if (
      agenciesQuery.error instanceof ApiError &&
      agenciesQuery.error.status === 401
    ) {
      redirectOnSessionExpiry(agenciesQuery.error)
    }
  }, [agenciesQuery.error, redirectOnSessionExpiry])

  const agencies = agenciesQuery.data ?? []
  const filtered = isFiltered(search, statusFilter)

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Agencies</h1>
          <p className="text-sm text-muted-foreground">
            Every travel agency on the platform, its owner and its status.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon />
          Create agency
        </Button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <label htmlFor="agencies-search" className="sr-only">
              Search agencies
            </label>
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="agencies-search"
              type="search"
              placeholder="Search by name, code or country"
              className="pl-8 md:w-72"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
          <Tabs
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <TabsList>
              <TabsTrigger value="ALL">All</TabsTrigger>
              <TabsTrigger value="ACTIVE">Active</TabsTrigger>
              <TabsTrigger value="SUSPENDED">Suspended</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {agenciesQuery.isPending ? <AgenciesLoading /> : null}

      {!agenciesQuery.isPending && agenciesQuery.isError ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <CircleAlertIcon className="size-4" />
              {getAgencyErrorMessage("load-agency", agenciesQuery.error)}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void agenciesQuery.refetch()}
            >
              <RefreshCwIcon />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!agenciesQuery.isPending &&
      !agenciesQuery.isError &&
      agencies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <BuildingIcon className="size-8 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">
                {filtered ? "No agencies match your filters" : "No agencies yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {filtered
                  ? "Try a different name, code, country or status."
                  : "No travel agency has been created on the platform yet. Create the first one to get started."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!agenciesQuery.isPending &&
      !agenciesQuery.isError &&
      agencies.length > 0 ? (
        <AgenciesTable
          agencies={agencies}
          onEdit={setEditAgency}
          onSetStatus={(agency, status) => setStatusTarget({ agency, status })}
        />
      ) : null}

      <CreateAgencyDialog
        open={createOpen}
        onSuccess={(message) => toast.success(message)}
        onOpenChange={setCreateOpen}
      />

      {editAgency ? (
        <EditAgencyDialog
          agency={editAgency}
          open
          onSuccess={(message) => toast.success(message)}
          onOpenChange={(open) => {
            if (!open) {
              setEditAgency(null)
            }
          }}
        />
      ) : null}

      {statusTarget ? (
        <SetAgencyStatusDialog
          agency={statusTarget.agency}
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
