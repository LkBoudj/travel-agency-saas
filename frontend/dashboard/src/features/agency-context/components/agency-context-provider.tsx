import { Link, Navigate, Outlet, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { CircleAlertIcon, RefreshCwIcon } from "lucide-react"

import { ROUTES } from "@/app/router/route-paths"
import { Button, buttonVariants } from "@/components/ui/button"
import { FullPageLoader } from "@/components/shared/full-page-loader"
import { ApiError } from "@/lib/api"
import {
  agencyContextQueryKey,
  getAgencyContext,
} from "../api/agency-context.api"
import { getAgencyContextErrorMessage } from "../lib/agency-context-error-adapter"
import { AgencyContextValue } from "../hooks/use-agency-context"

/**
 * Loads the agency context for the `:agencyCode` in the URL and provides it to
 * everything below.
 *
 * The URL is the only source of agency context — there is no stored "current
 * agency" — so two tabs open on two agencies each resolve their own context and
 * neither can disturb the other. Changing the code in the address bar simply
 * loads the other agency, because the query key is derived from it.
 *
 * Everything the backend can refuse is surfaced honestly: a missing agency, a
 * suspended one, a missing or suspended membership. None of those are retried
 * away, because they are answers, not failures.
 */
export function AgencyContextProvider() {
  const { agencyCode = "" } = useParams<{ agencyCode: string }>()

  const query = useQuery({
    queryKey: agencyContextQueryKey(agencyCode),
    queryFn: () => getAgencyContext(agencyCode),
    enabled: agencyCode.length > 0,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status < 500) return false
      return failureCount < 2
    },
  })

  if (!agencyCode) {
    return <Navigate to={ROUTES.agencies} replace />
  }

  if (query.isPending) {
    return <FullPageLoader />
  }

  if (query.isError) {
    const unauthenticated =
      query.error instanceof ApiError && query.error.status === 401
    if (unauthenticated) {
      return <Navigate to={ROUTES.login} replace />
    }

    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <CircleAlertIcon className="size-8 text-muted-foreground" />
        <p className="max-w-sm text-sm text-muted-foreground">
          {getAgencyContextErrorMessage(query.error)}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <RefreshCwIcon />
            Try again
          </Button>
          <Link to={ROUTES.agencies} className={buttonVariants({ size: "sm" })}>
            Choose another agency
          </Link>
        </div>
      </div>
    )
  }

  return (
    <AgencyContextValue value={query.data}>
      <Outlet />
    </AgencyContextValue>
  )
}
