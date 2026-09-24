import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Group, Stack, Text, TextInput, Textarea, Badge } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ErrorState } from '../../../components/empty-state.tsx';
import { useBookingMutations } from '../hooks/use-bookings.ts';
import { useTravelerForm, travelerFormInitialValues } from '../hooks/use-traveler-form.ts';
import { useTravelers } from '../hooks/use-travelers.ts';
import {
  canViewTravelers,
  type BookingTravelerCapabilities,
  type BookingCapabilities,
} from '../lib/booking-actions.ts';
import { getBookingErrorMessage } from '../lib/booking-error-messages.ts';
import { buildTravelerWritePayload } from '../lib/traveler-payloads.ts';
import type { BookingDetail, BookingTraveler, TravelerWritePayload } from '../types.ts';

export interface TravelersManagerProps {
  booking: BookingDetail;
  capabilities: BookingCapabilities;
}

/**
 * The booking's traveler manifest.
 *
 * A traveler is one named seat. Adding/editing is offered to members with the
 * write permissions while the booking is still PENDING; once it leaves PENDING
 * the manifest is frozen and the backend rejects any write regardless of this
 * UI. There is no delete — the backend has no delete endpoint.
 */
export function TravelersManager({ booking, capabilities }: TravelersManagerProps) {
  const { t } = useTranslation('bookings');
  const travelersQuery = useTravelers(booking.code);
  const travelers = travelersQuery.data ?? [];

  const frozen = booking.status !== 'PENDING';
  const writable = canViewTravelers(capabilities) && capabilities.traveler.canCreate;

  const [adding, setAdding] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const stopEditing = () => {
    setAdding(false);
    setEditingCode(null);
  };

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="baseline">
        <Text fw={600}>{t('travelers.title')}</Text>
        <Group gap="xs">
          <Badge variant="light" color="gray">
            {t('travelers.manifest', { count: travelers.length, seats: booking.reservedSeats })}
          </Badge>
          {frozen ? (
            <Badge variant="light" color="gray">
              {t('travelers.frozen')}
            </Badge>
          ) : null}
        </Group>
      </Group>

      <Card withBorder radius="md" p="xs">
        {travelersQuery.isPending ? (
          <Text size="sm" c="dimmed" p="xs">
            {t('page.loading')}
          </Text>
        ) : travelersQuery.isError ? (
          <ErrorState
            title={getBookingErrorMessage(travelersQuery.error, t)}
            onRetry={() => void travelersQuery.refetch()}
          />
        ) : travelers.length === 0 ? (
          <Text size="sm" c="dimmed" p="xs">
            {t('travelers.empty')}
          </Text>
        ) : (
          <Stack gap={4}>
            {travelers.map((traveler) => (
              <TravelerRow
                key={traveler.code}
                booking={booking}
                traveler={traveler}
                frozen={frozen}
                capabilities={capabilities.traveler}
                editing={editingCode === traveler.code}
                editingActive={adding}
                onStartEdit={() => setEditingCode(traveler.code)}
                onDone={stopEditing}
              />
            ))}
          </Stack>
        )}

        {adding ? (
          <TravelerForm
            booking={booking}
            travelerCode={null}
            initialValues={travelerFormInitialValues(null)}
            submitLabel={t('travelers.addTitle')}
            onDone={stopEditing}
            onClose={stopEditing}
          />
        ) : !frozen && writable ? (
          <Button
            size="xs"
            variant="light"
            mt="sm"
            ml="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => setAdding(true)}
          >
            {t('travelers.add')}
          </Button>
        ) : null}
      </Card>
    </Stack>
  );
}

function TravelerRow({
  booking,
  traveler,
  frozen,
  capabilities,
  editing,
  editingActive,
  onStartEdit,
  onDone,
}: {
  booking: BookingDetail;
  traveler: BookingTraveler;
  frozen: boolean;
  capabilities: BookingTravelerCapabilities;
  editing: boolean;
  editingActive: boolean;
  onStartEdit: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation('bookings');

  if (editing && !editingActive) {
    return (
      <TravelerForm
        booking={booking}
        travelerCode={traveler.code}
        initialValues={travelerFormInitialValues(traveler)}
        submitLabel={t('travelers.editTitle')}
        onDone={onDone}
        onClose={onDone}
      />
    );
  }

  return (
    <Group justify="space-between" gap="sm" p="xs" wrap="nowrap">
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text size="sm" fw={500} truncate>
          {traveler.firstName} {traveler.lastName}{' '}
          <Text component="span" c="dimmed" ff="monospace" size="xs">
            {traveler.code}
          </Text>
        </Text>
        {traveler.email || traveler.phone ? (
          <Text size="xs" c="dimmed" dir="ltr" truncate>
            {[traveler.email, traveler.phone].filter(Boolean).join(' · ')}
          </Text>
        ) : traveler.notes ? (
          <Text size="xs" c="dimmed" truncate>
            {traveler.notes}
          </Text>
        ) : null}
      </Stack>
      {!frozen && capabilities.canUpdate ? (
        <Button size="xs" variant="subtle" onClick={onStartEdit}>
          {t('travelers.edit')}
        </Button>
      ) : null}
    </Group>
  );
}

function TravelerForm({
  booking,
  travelerCode,
  initialValues,
  submitLabel,
  onDone,
  onClose,
}: {
  booking: BookingDetail;
  travelerCode: string | null;
  initialValues: ReturnType<typeof travelerFormInitialValues>;
  submitLabel: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('bookings');
  const { addTraveler, updateTraveler } = useBookingMutations();
  const form = useTravelerForm(initialValues);
  const pending = addTraveler.isPending || updateTraveler.isPending;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onSubmit = form.onSubmit((values) => {
    setErrorMessage(null);
    const payload: TravelerWritePayload = buildTravelerWritePayload(values);
    const onSuccess = () => {
      notifications.show({
        message: travelerCode ? t('travelers.successUpdated') : t('travelers.successAdded'),
        color: 'teal',
      });
      onDone();
    };
    const onError = (error: unknown) => setErrorMessage(getBookingErrorMessage(error, t));

    if (travelerCode) {
      updateTraveler.mutate(
        { bookingCode: booking.code, travelerCode, payload },
        { onSuccess, onError }
      );
    } else {
      addTraveler.mutate({ bookingCode: booking.code, payload }, { onSuccess, onError });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card withBorder radius="md" bg="var(--mantine-color-gray-0)" p="sm">
        <Stack gap="sm">
          <Group gap="sm" grow>
            <TextInput
              label={t('travelers.fields.firstName')}
              placeholder={t('travelers.fields.firstNamePlaceholder')}
              {...form.getInputProps('firstName')}
            />
            <TextInput
              label={t('travelers.fields.lastName')}
              placeholder={t('travelers.fields.lastNamePlaceholder')}
              {...form.getInputProps('lastName')}
            />
          </Group>
          <TextInput
            label={t('travelers.fields.email')}
            placeholder={t('travelers.fields.emailPlaceholder')}
            dir="ltr"
            {...form.getInputProps('email')}
          />
          <TextInput
            label={t('travelers.fields.phone')}
            placeholder={t('travelers.fields.phonePlaceholder')}
            dir="ltr"
            {...form.getInputProps('phone')}
          />
          <Textarea
            label={t('travelers.fields.notes')}
            placeholder={t('travelers.fields.notesPlaceholder')}
            autosize
            minRows={2}
            {...form.getInputProps('notes')}
          />
          {errorMessage ? (
            <Text size="sm" c="red" role="alert">
              {errorMessage}
            </Text>
          ) : null}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" size="xs" onClick={onClose} disabled={pending}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button type="submit" size="xs" loading={pending}>
              {submitLabel}
            </Button>
          </Group>
        </Stack>
      </Card>
    </form>
  );
}
