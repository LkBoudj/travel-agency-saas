import { useAgencyPermission } from "@/features/agency-context/hooks/use-agency-permission"
import {
  TOUR_PERMISSIONS,
  type TourCapabilities,
} from "../lib/tour-actions"

/**
 * What the signed-in member may do with trips here, for UX decisions only.
 *
 * Hiding a control the caller cannot use is courtesy, not security: every one
 * of these operations is independently guarded by the backend.
 */
export function useTourCapabilities(): TourCapabilities {
  return {
    canView: useAgencyPermission(TOUR_PERMISSIONS.view),
    canCreate: useAgencyPermission(TOUR_PERMISSIONS.create),
    canUpdate: useAgencyPermission(TOUR_PERMISSIONS.update),
    canPublish: useAgencyPermission(TOUR_PERMISSIONS.publish),
    canArchive: useAgencyPermission(TOUR_PERMISSIONS.delete),
  }
}