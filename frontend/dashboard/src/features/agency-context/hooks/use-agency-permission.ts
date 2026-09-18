import { useAgencyContext } from "./use-agency-context"
import { hasAgencyPermissions } from "../lib/agency-permissions"

/**
 * Whether the signed-in member holds every given AGENCY permission in the
 * current agency.
 *
 * This is the one place components ask that question, so no component ends up
 * doing `permissions.includes("...")` by hand. It answers a UX question only —
 * whether a control is worth rendering. The backend guards every agency route
 * regardless, and remain the authority.
 */
export function useAgencyPermission(...required: string[]): boolean {
  const { permissions } = useAgencyContext()
  return hasAgencyPermissions(permissions, required)
}

/** The full effective permission set, for the rare case a list is needed. */
export function useAgencyPermissions(): readonly string[] {
  return useAgencyContext().permissions
}
