import { useParams } from 'react-router-dom';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import { BookingCancelDialog } from '../components/booking-cancel-dialog.tsx';
import { BookingConfirmDialog } from '../components/booking-confirm-dialog.tsx';
import { BookingDetailsView } from '../components/booking-details-view.tsx';
import { useBookingDetailsPage } from '../hooks/use-booking-details-page.ts';

export function BookingDetailsPage() {
  const { code } = useAgencyContext();
  const { bookingCode } = useParams<{ bookingCode: string }>();
  const controller = useBookingDetailsPage(bookingCode);
  const booking = controller.booking.data ?? null;

  return (
    <>
      <BookingDetailsView agencyCode={code} controller={controller} />
      <BookingCancelDialog
        booking={booking}
        opened={controller.isCancelOpen}
        onClose={controller.closeCancel}
      />
      <BookingConfirmDialog
        booking={booking}
        opened={controller.isConfirmOpen}
        onClose={controller.closeConfirm}
      />
    </>
  );
}
