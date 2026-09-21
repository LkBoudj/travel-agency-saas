import { useAgencyPermission } from "@/features/agency-context/hooks/use-agency-permission"
import {
  BOOKING_PERMISSIONS,
  TRAVELER_PERMISSIONS,
} from "../lib/booking-actions"
import type { BookingCapabilities } from "../lib/booking-actions"

/**
 * What the signed-in member may do with bookings here, for UX decisions only.
 *
 * Hiding a control the caller cannot use is courtesy, not security: every one
 * of these operations is independently guarded by the backend.
 */
export function useBookingCapabilities(): BookingCapabilities {
  return {
    canView: useAgencyPermission(BOOKING_PERMISSIONS.view),
    canCreate: useAgencyPermission(BOOKING_PERMISSIONS.create),
    canCancel: useAgencyPermission(BOOKING_PERMISSIONS.cancel),
    canConfirm: useAgencyPermission(BOOKING_PERMISSIONS.confirm),
    traveler: {
      canView: useAgencyPermission(TRAVELER_PERMISSIONS.view),
      canCreate: useAgencyPermission(TRAVELER_PERMISSIONS.create),
      canUpdate: useAgencyPermission(TRAVELER_PERMISSIONS.update),
    },
  }
}