import { createContext, use } from "react"

import type { AgencyContext } from "../types/agency-context.types"

/**
 * Holds the agency resolved from the `:agencyCode` in the URL.
 *
 * It lives here rather than beside the provider so that file exports only a
 * component, which is what Fast Refresh needs.
 */
export const AgencyContextValue = createContext<AgencyContext | null>(null)

/**
 * The current agency context. Only callable below `AgencyContextProvider`,
 * which means the agency exists, is operational, and the caller holds an
 * ACTIVE membership in it.
 */
export function useAgencyContext(): AgencyContext {
  const context = use(AgencyContextValue)
  if (!context) {
    throw new Error(
      "useAgencyContext must be used inside an AgencyContextProvider route."
    )
  }
  return context
}
