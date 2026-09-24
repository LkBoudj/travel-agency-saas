import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Stack, Text, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { FormActions } from '../../../components/form/form-actions.tsx';
import { ModalFormShell } from '../../../components/form/modal-form-shell.tsx';
import { useBookingMutations } from '../hooks/use-bookings.ts';
import { getBookingErrorMessage } from '../lib/booking-error-messages.ts';
import { buildCancelBookingPayload } from '../lib/booking-payloads.ts';
import type { AgencyBooking } from '../types.ts';

export interface BookingCancelDialogProps {
  booking: AgencyBooking | null;
  opened: boolean;
  onClose: () => void;
}

/**
 * One-way cancellation: PENDING/CONFIRMED → CANCELLED, releasing the reserved
 * seats back to the departure. The reason is stored when given. There is no
 * restore — the guard is the destructive submit, and the backend enforces the
 * transition.
 */
export function BookingCancelDialog({ booking, opened, onClose }: BookingCancelDialogProps) {
  const { t } = useTranslation('bookings');

  return (
    <ModalFormShell opened={opened} onClose={onClose} title={t('cancelDialog.title')} size="md">
      {booking ? <CancelBody booking={booking} onClose={onClose} /> : null}
    </ModalFormShell>
  );
}

function CancelBody({ booking, onClose }: { booking: AgencyBooking; onClose: () => void }) {
  const { t } = useTranslation('bookings');
  const { cancel } = useBookingMutations();
  const [reason, setReason] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    cancel.mutate(
      {
        bookingCode: booking.code,
        reason: buildCancelBookingPayload(reason).reason ?? null,
      },
      {
        onSuccess: () => {
          notifications.show({ message: t('cancelDialog.success'), color: 'teal' });
          onClose();
        },
        onError: (error) => setErrorMessage(getBookingErrorMessage(error, t)),
      }
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t('cancelDialog.description')}
        </Text>
        <Textarea
          label={t('cancelDialog.reasonLabel')}
          placeholder={t('cancelDialog.reasonPlaceholder')}
          value={reason}
          onChange={(event) => setReason(event.currentTarget.value)}
          maxLength={500}
          dir="auto"
          autosize
          minRows={3}
        />
        {errorMessage ? (
          <Text size="sm" c="red" role="alert">
            {errorMessage}
          </Text>
        ) : null}
      </Stack>
      <FormActions
        submitLabel={t('cancelDialog.submit')}
        onCancel={onClose}
        submitting={cancel.isPending}
      />
    </form>
  );
}
