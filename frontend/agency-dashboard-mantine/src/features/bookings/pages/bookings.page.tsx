import { BookingsView } from '../components/bookings-view.tsx';
import { CreateBookingDialog } from '../components/create-booking-dialog.tsx';
import { useBookingsPage } from '../hooks/use-bookings-page.ts';

export function BookingsPage() {
  const controller = useBookingsPage();

  return (
    <>
      <BookingsView {...controller} />
      <CreateBookingDialog opened={controller.isCreateOpen} onClose={controller.closeCreate} />
    </>
  );
}
