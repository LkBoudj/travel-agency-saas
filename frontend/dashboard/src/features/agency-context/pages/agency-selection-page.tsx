import { useEffect } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { BuildingIcon, CircleAlertIcon, RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FullPageLoader } from "@/components/shared/full-page-loader"
import { useLogout } from "@/features/auth/hooks/use-logout"
import { useMyAgencies } from "../hooks/use-my-agencies"
import { agencyDashboardPath } from "../lib/agency-paths"
import {
  agencyUnavailableReason,
  decideAgencySelection,
  isAgencyEnterable,
} from "../lib/agency-selection"
import type { MyAgency } from "../types/agency-context.types"

function AgencyRow({ agency }: { agency: MyAgency }) {
  const reason = agencyUnavailableReason(agency)
  const enterable = isAgencyEnterable(agency)

  const inner = (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <BuildingIcon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{agency.name}</span>
          {agency.membershipType === "OWNER" ? (
            <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-muted-foreground">
              Owner
            </span>
          ) : null}
        </span>
        {reason ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{reason}</span>
        ) : null}
      </span>
    </div>
  )

  if (!enterable) {
    // Shown, not hidden: an unavailable agency with a reason is far more useful
    // than a name that silently disappeared.
    return (
      <li className="rounded-lg border border-dashed p-3 opacity-60">{inner}</li>
    )
  }

  return (
    <li>
      <Link
        to={agencyDashboardPath(agency.code)}
        className="block rounded-lg border p-3 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {inner}
      </Link>
    </li>
  )
}

/**
 * Landing screen after sign-in: works out which agency to open.
 *
 * Selecting an agency is navigation, not state — it produces a URL and nothing
 * is remembered globally, so opening a second agency in another tab is normal
 * rather than a conflict.
 */
export function AgencySelectionPage() {
  const query = useMyAgencies()
  const navigate = useNavigate()
  const logout = useLogout()

  const decision = query.data ? decideAgencySelection(query.data) : null

  useEffect(() => {
    if (decision?.kind === "AUTO") {
      navigate(agencyDashboardPath(decision.agencyCode), { replace: true })
    }
  }, [decision, navigate])

  if (query.isPending) {
    return <FullPageLoader />
  }

  if (query.isError) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <CircleAlertIcon className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          We could not load your agencies.
        </p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          <RefreshCwIcon />
          Try again
        </Button>
      </div>
    )
  }

  if (decision?.kind === "AUTO") {
    // The effect above is redirecting; avoid flashing the chooser first.
    return <Navigate to={agencyDashboardPath(decision.agencyCode)} replace />
  }

  const agencies = query.data ?? []

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {agencies.length === 0 ? "No agency yet" : "Choose an agency"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {agencies.length === 0
                ? "You are not a member of any agency yet. Ask an agency owner to add you."
                : "Pick the agency you want to work in."}
            </p>
          </div>

          {agencies.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {agencies.map((agency) => (
                <AgencyRow key={agency.code} agency={agency} />
              ))}
            </ul>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className="self-start"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}
