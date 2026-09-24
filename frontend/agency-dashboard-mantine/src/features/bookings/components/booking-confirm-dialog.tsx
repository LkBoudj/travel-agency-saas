import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { FormActions } from '../../../components/form/form-actions.tsx';
import { ModalFormShell } from '../../../components/form/modal-form-shell.tsx';
import { useBookingMutations } from '../hooks/use-bookings.ts';
import { useTravelers } from '../hooks/use-travelers.ts';
import { getBookingErrorMessage } from '../lib/booking-error-messages.ts';
import { travelerManifestComplete } from '../lib/traveler-payloads.ts';
import type { AgencyBooking } from '../types.ts';

export interface BookingConfirmDialogProps {
  booking: AgencyBooking | null;
  opened: boolean;
  onClose: () => void;
}

/**
 * One-way PENDING → CONFIRMED.
 *
 * There is no body to fill — the only thing an operator needs to know is
 * whether the traveler manifest matches the reserved seats. The backend
 * re-checks that equal count under a booking row lock and refuses a partial
 * manifest with `BOOKING_TRAVELER_COUNT_MISMATCH`; the readiness line here is
 * the same arithmetic, shown before the fact.
 */
export function BookingConfirmDialog({ booking, opened, onClose }: BookingConfirmDialogProps) {
  const { t } = useTranslation('bookings');

  return (
    <ModalFormShell opened={opened} onClose={onClose} title={t('confirmDialog.title')} size="md">
      {booking ? <ConfirmBody booking={booking} onClose={onClose} /> : null}
    </ModalFormShell>
  );
}

function ConfirmBody({ booking, onClose }: { booking: AgencyBooking; onClose: () => void }) {
  const { t } = useTranslation('bookings');
  const { confirm } = useBookingMutations();
  const travelersQuery = useTravelers(booking.code);
  const travelerCount = travelersQuery.data?.length ?? 0;
  const complete = travelerManifestComplete(travelerCount, booking.reservedSeats);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = () => {
    setErrorMessage(null);
    confirm.mutate(
      { bookingCode: booking.code },
      {
        onSuccess: () => {
          notifications.show({ message: t('confirmDialog.success'), color: 'teal' });
          onClose();
        },
        onError: (error) => setErrorMessage(getBookingErrorMessage(error, t)),
      }
    );
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('confirmDialog.description')}
        </Text>
        <Text size="sm">
          {complete
            ? t('confirmDialog.complete')
            : t('confirmDialog.incomplete', {
                count: travelerCount,
                seats: booking.reservedSeats,
              })}
        </Text>
        {errorMessage ? (
          <Text size="sm" c="red" role="alert">
            {errorMessage}
          </Text>
        ) : null}
      </Stack>
      <FormActions
        submitLabel={t('confirmDialog.submit')}
        onCancel={onClose}
        submitting={confirm.isPending}
        disabled={!complete}
      />
    </form>
  );
}
