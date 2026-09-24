import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import {
  BOOKING_PERMISSIONS,
  TRAVELER_PERMISSIONS,
  type BookingCapabilities,
} from '../lib/booking-actions.ts';

/**
 * What the signed-in member may do with bookings here, for UX decisions only.
 *
 * Hiding a control the caller cannot use is courtesy, not security: every one
 * of these operations is independently guarded by the backend.
 */
export function useBookingCapabilities(): BookingCapabilities {
  const { can } = useAgencyContext();
  return {
    canView: can(BOOKING_PERMISSIONS.view),
    canCreate: can(BOOKING_PERMISSIONS.create),
    canCancel: can(BOOKING_PERMISSIONS.cancel),
    canConfirm: can(BOOKING_PERMISSIONS.confirm),
    traveler: {
      canView: can(TRAVELER_PERMISSIONS.view),
      canCreate: can(TRAVELER_PERMISSIONS.create),
      canUpdate: can(TRAVELER_PERMISSIONS.update),
    },
  };
}
