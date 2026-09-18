import { Navigate, useLocation } from "react-router-dom"

import { ROUTES } from "@/app/router/route-paths"
import { FullPageLoader } from "@/components/shared/full-page-loader"
import { useMyAgencies } from "../hooks/use-my-agencies"
import { legacyPathToAgencyPath } from "../lib/agency-paths"
import { decideAgencySelection } from "../lib/agency-selection"

/**
 * Keeps pre-agency-scoped links working.
 *
 * `/trips` has no agency in it, so the destination is resolved the same way
 * signing in does: one enterable agency goes straight to `/agencies/X/trips`,
 * anything else lands on the chooser. The section is preserved either way, so
 * an old bookmark still reaches the screen it named.
 */
export function LegacyRedirectPage() {
  const location = useLocation()
  const query = useMyAgencies()

  if (query.isPending) {
    return <FullPageLoader />
  }

  const decision = query.data ? decideAgencySelection(query.data) : { kind: "NONE" as const }

  if (decision.kind === "AUTO") {
    return (
      <Navigate
        to={legacyPathToAgencyPath(decision.agencyCode, location.pathname)}
        replace
      />
    )
  }

  return <Navigate to={ROUTES.agencies} replace />
}
