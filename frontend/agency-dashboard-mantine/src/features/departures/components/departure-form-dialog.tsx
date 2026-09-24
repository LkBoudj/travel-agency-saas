import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Grid, NumberInput, Select, Stack, Text, Textarea } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { FormActions } from '../../../components/form/form-actions.tsx';
import { ModalFormShell } from '../../../components/form/modal-form-shell.tsx';
import { departureFormInitialValues, useDepartureForm } from '../hooks/use-departure-form.ts';
import type { DepartureFormValues } from '../schemas/departure.schema.ts';
import type { Departure, DepartureStatus } from '../types.ts';

const PICKER_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export interface DepartureFormDialogProps {
  /** `null` opens the create form; a departure opens the edit form for it. */
  departure: Departure | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: DepartureFormValues, status: DepartureStatus) => void;
}

/**
 * Create/Edit one departure. Create always lands with status OPEN — the
 * backend fixes it, so the field is hidden. Edit exposes the OPEN/CLOSED
 * status picker. CANCELLED is terminal and never offered here; it happens
 * through the cancel action only.
 */
export function DepartureFormDialog({
  departure,
  submitting,
  onClose,
  onSubmit,
}: DepartureFormDialogProps) {
  const { t, i18n } = useTranslation('departures');
  const locale = i18n.language?.startsWith('ar') ? 'ar-dz' : 'en';
  const isEditing = departure !== null;
  const [status, setStatus] = useState<DepartureStatus>(departure?.status ?? 'OPEN');
  const form = useDepartureForm(departureFormInitialValues(departure));

  const handleSubmit = form.onSubmit((values) => onSubmit(values, status));

  return (
    <ModalFormShell
      opened
      onClose={onClose}
      title={t(isEditing ? 'editDialog.title' : 'createDialog.title')}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          <Text size="sm" c="dimmed">
            {t(isEditing ? 'editDialog.description' : 'createDialog.description')}
          </Text>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateTimePicker
                label={t('fields.startLabel')}
                placeholder={t('fields.startPlaceholder')}
                valueFormat={PICKER_FORMAT}
                locale={locale}
                clearable
                {...form.getInputProps('startAt')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateTimePicker
                label={t('fields.endLabel')}
                placeholder={t('fields.endPlaceholder')}
                valueFormat={PICKER_FORMAT}
                locale={locale}
                clearable
                {...form.getInputProps('endAt')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <NumberInput
                label={t('fields.capacityLabel')}
                min={1}
                allowDecimal={false}
                {...form.getInputProps('capacity')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <DateTimePicker
                label={t('fields.deadlineLabel')}
                placeholder={t('fields.deadlinePlaceholder')}
                description={t('fields.deadlineHelper')}
                valueFormat={PICKER_FORMAT}
                locale={locale}
                clearable
                {...form.getInputProps('bookingDeadline')}
              />
            </Grid.Col>
          </Grid>

          {isEditing ? (
            <Select
              label={t('fields.statusLabel')}
              data={[
                { value: 'OPEN', label: t('statuses.open', { ns: 'common' }) },
                { value: 'CLOSED', label: t('statuses.closed', { ns: 'common' }) },
              ]}
              value={status}
              onChange={(value) => setStatus((value as DepartureStatus) ?? 'OPEN')}
              allowDeselect={false}
            />
          ) : null}

          <Textarea
            label={t('fields.notesLabel')}
            placeholder={t('fields.notesPlaceholder')}
            autosize
            minRows={3}
            {...form.getInputProps('notes')}
          />
        </Stack>

        <FormActions
          submitLabel={t(isEditing ? 'editDialog.submit' : 'createDialog.submit')}
          onCancel={onClose}
          submitting={submitting}
        />
      </form>
    </ModalFormShell>
  );
}
