import { useAgencyPermission } from "@/features/agency-context/hooks/use-agency-permission"
import { CUSTOMER_PERMISSIONS } from "../lib/customer-actions"
import type { CustomerCapabilities } from "../lib/customer-actions"

/**
 * What the signed-in member may do with customers here, for UX decisions only.
 *
 * Hiding a control the caller cannot use is courtesy, not security: every one
 * of these operations is independently guarded by the backend.
 */
export function useCustomerCapabilities(): CustomerCapabilities {
  return {
    canView: useAgencyPermission(CUSTOMER_PERMISSIONS.view),
    canCreate: useAgencyPermission(CUSTOMER_PERMISSIONS.create),
    canUpdate: useAgencyPermission(CUSTOMER_PERMISSIONS.update),
    canArchive: useAgencyPermission(CUSTOMER_PERMISSIONS.archive),
  }
}