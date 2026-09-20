// Explicit .ts extension: this module is loaded directly by `node --test`,
// whose ESM resolver does not guess extensions. `allowImportingTsExtensions`
// is enabled and Vite resolves it, so one definition serves both.
import { isArchivedCustomer } from "./customer-display.ts"

export const CUSTOMER_PERMISSIONS = {
  view: "AGENCY_CUSTOMER_VIEW",
  create: "AGENCY_CUSTOMER_CREATE",
  update: "AGENCY_CUSTOMER_UPDATE",
  archive: "AGENCY_CUSTOMER_ARCHIVE",
} as const

/** What the signed-in member may do with customers, as far as the UI can tell. */
export type CustomerCapabilities = {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canArchive: boolean
}

type CustomerLike = { status: string }

/**
 * Which row actions to render for one customer.
 *
 * Permission is a UX decision only — hiding a control the caller cannot use
 * avoids offering a guaranteed 403, but the backend guard is what enforces
 * it. Editing stays offered for archived customers because the backend
 * permits it; archiving is not offered once it has happened, since it is a
 * one-way action (`CUSTOMER_ALREADY_ARCHIVED` otherwise).
 */
export function customerRowActions(
  customer: CustomerLike,
  capabilities: CustomerCapabilities
) {
  const archived = isArchivedCustomer(customer)

  return {
    canViewDetails: capabilities.canView,
    canEdit: capabilities.canUpdate,
    canArchive: capabilities.canArchive && !archived,
  }
}

export type CustomerRowActions = ReturnType<typeof customerRowActions>

/** Whether any action at all is available, so an empty menu is never rendered. */
export function hasAnyRowAction(actions: CustomerRowActions): boolean {
  return actions.canViewDetails || actions.canEdit || actions.canArchive
}