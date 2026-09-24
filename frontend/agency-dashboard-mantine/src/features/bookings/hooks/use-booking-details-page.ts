import { useState } from 'react';
import { useBookingCapabilities } from './use-booking-capabilities.ts';
import { useBooking } from './use-booking.ts';
import { useTravelers } from './use-travelers.ts';

export interface BookingDetailsPageController {
  bookingCode: string;
  booking: ReturnType<typeof useBooking>;
  travelers: ReturnType<typeof useTravelers>;
  capabilities: ReturnType<typeof useBookingCapabilities>;
  isCancelOpen: boolean;
  openCancel: () => void;
  closeCancel: () => void;
  isConfirmOpen: boolean;
  openConfirm: () => void;
  closeConfirm: () => void;
}

/**
 * Owns the presence of the two lifecycle dialogs and gathers the booking,
 * its traveler manifest and the capability set that the details page renders.
 */
export function useBookingDetailsPage(
  bookingCode: string | undefined
): BookingDetailsPageController {
  const [isCancelOpen, setCancelOpen] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  return {
    bookingCode: bookingCode ?? '',
    booking: useBooking(bookingCode),
    travelers: useTravelers(bookingCode),
    capabilities: useBookingCapabilities(),
    isCancelOpen,
    openCancel: () => setCancelOpen(true),
    closeCancel: () => setCancelOpen(false),
    isConfirmOpen,
    openConfirm: () => setConfirmOpen(true),
    closeConfirm: () => setConfirmOpen(false),
  };
}
