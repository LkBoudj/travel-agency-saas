import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Checkbox, Grid, Group, Select, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { dashboardPaths } from '../../../app/router/route-paths.ts';
import { EntityCombobox } from '../../../components/entity-picker/entity-combobox.tsx';
import type { EntityOption } from '../../../components/entity-picker/entity-option.ts';
import { splitKeywordIntoPersonName } from '../../../components/entity-picker/quick-create-flow.ts';
import { QuickCreateDialog } from '../../../components/entity-picker/quick-create.tsx';
import { FormActions } from '../../../components/form/form-actions.tsx';
import { FormErrorSummary } from '../../../components/form/form-error-summary.tsx';
import { ModalFormShell } from '../../../components/form/modal-form-shell.tsx';
import { useAppLocale } from '../../../i18n/hooks/use-app-locale.ts';
import { getIntlLocale } from '../../../i18n/locales.ts';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import { useCustomerForm } from '../../customers/hooks/use-customer-form.ts';
import { useCustomers, useCustomersMutations } from '../../customers/hooks/use-customers.ts';
import { customerDisplayName } from '../../customers/lib/customer-display.ts';
import { getCustomerErrorMessage } from '../../customers/lib/customer-error-messages.ts';
import { useDepartures } from '../../departures/hooks/use-departures.ts';
import { useDeparturePrices } from '../../pricing/hooks/use-pricing.ts';
import type { DeparturePriceItem } from '../../pricing/types.ts';
import { useTours } from '../../trips/hooks/use-tours.ts';
import { useBookingForm } from '../hooks/use-booking-form.ts';
import { useBookingMutations } from '../hooks/use-bookings.ts';
import { formatBookingAmount, formatBookingDate } from '../lib/booking-display.ts';
import { getBookingErrorMessage } from '../lib/booking-error-messages.ts';
import { buildCreateBookingPayload } from '../lib/booking-payloads.ts';

export interface CreateBookingDialogProps {
  opened: boolean;
  onClose: () => void;
}

/**
 * Create a booking for the current agency.
 *
 * The form walks a real cascade — customer → tour → departure → stored add-on
 * prices — and sends only public codes. Amounts are NEVER sent: the server
 * snapshots the price lines and the total from the departure's stored prices
 * under a row lock, so the estimate below is preview-only and the recorded
 * ledger is the server's word. The customer field is a searchable picker with
 * inline quick-create for a brand-new name (courtesy only; the customer
 * endpoint and the booking guards stay authoritative).
 */
export function CreateBookingDialog({ opened, onClose }: CreateBookingDialogProps) {
  const { t } = useTranslation('bookings');

  return (
    <ModalFormShell opened={opened} onClose={onClose} title={t('createDialog.title')} size="lg">
      {opened ? <CreateBookingBody onClose={onClose} /> : null}
    </ModalFormShell>
  );
}

function CreateBookingBody({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('bookings');
  const navigate = useNavigate();
  const { code, can } = useAgencyContext();
  const intlLocale = getIntlLocale(useAppLocale());

  const form = useBookingForm();
  const { create } = useBookingMutations();
  const { create: createCustomer } = useCustomersMutations();
  const customerForm = useCustomerForm({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  });

  const customersQuery = useCustomers();
  const toursQuery = useTours();
  const departuresQuery = useDepartures(form.values.tourCode || undefined);
  const pricesQuery = useDeparturePrices(
    form.values.tourCode,
    form.values.departureCode || undefined
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quickCreateKeyword, setQuickCreateKeyword] = useState<string | null>(null);

  const customers = customersQuery.data ?? [];
  const tours = toursQuery.data ?? [];
  const openDepartures = (departuresQuery.data ?? []).filter(
    (departure) => departure.status === 'OPEN'
  );
  const priceLines = (pricesQuery.data?.prices ?? []).filter((line) => line.active);
  const currency = pricesQuery.data?.currency ?? 'DZD';

  const customerOptions: EntityOption[] = customers.map((customer) => ({
    code: customer.code,
    label: customerDisplayName(customer),
    sublabel: customer.email ?? customer.code,
  }));

  const seats = Number(form.values.reservedSeats);
  const estimatedTotal =
    Number.isFinite(seats) && seats > 0
      ? priceLines
          .filter((line) => form.values.pricingSelections.includes(line.pricingOptionCode))
          .reduce(
            (sum, line) => sum + (line.basis === 'per_person' ? line.amount * seats : line.amount),
            0
          )
      : null;

  const togglePricing = (code: string, selected: boolean) => {
    form.setFieldValue(
      'pricingSelections',
      selected
        ? [...form.values.pricingSelections, code]
        : form.values.pricingSelections.filter((candidate) => candidate !== code)
    );
  };

  const onSubmit = form.onSubmit((values) => {
    setErrorMessage(null);
    create.mutate(buildCreateBookingPayload(values), {
      onSuccess: (booking) => {
        notifications.show({ message: t('createDialog.success'), color: 'teal' });
        onClose();
        navigate(dashboardPaths.bookingsDetail(code, booking.code));
      },
      onError: (error) => setErrorMessage(getBookingErrorMessage(error, t)),
    });
  });

  const openQuickCreate = (keyword: string) => {
    const { firstName, lastName } = splitKeywordIntoPersonName(keyword);
    customerForm.setValues({ firstName, lastName, email: '', phone: '', notes: '' });
    customerForm.clearErrors();
    setQuickCreateKeyword(keyword);
  };

  const quickCreateSubmit = customerForm.onSubmit((values) => {
    createCustomer.mutate(
      { values },
      {
        onSuccess: (customer) => {
          form.setFieldValue('customerCode', customer.code);
          setQuickCreateKeyword(null);
          notifications.show({ message: t('customerQuickCreate.success'), color: 'teal' });
        },
        onError: (error) =>
          notifications.show({ message: getCustomerErrorMessage(error, t), color: 'red' }),
      }
    );
  });

  return (
    <>
      <form onSubmit={onSubmit} noValidate>
        <Stack gap="lg">
          <FormErrorSummary errors={form.errors} />
          <Text size="sm" c="dimmed">
            {t('createDialog.description')}
          </Text>

          <EntityCombobox
            label={t('createDialog.customerLabel')}
            options={customerOptions}
            value={form.values.customerCode}
            onSelect={(selection) => form.setFieldValue('customerCode', selection)}
            canCreate={can('AGENCY_CUSTOMER_CREATE')}
            onQuickCreate={openQuickCreate}
            placeholder={t('createDialog.customerPlaceholder')}
            nothingFound={t('page.noMatches')}
            loading={customersQuery.isPending}
            createLabel={(keyword) => t('createDialog.customerCreateLabel', { keyword })}
          />

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label={t('createDialog.tourLabel')}
                value={form.values.tourCode}
                onChange={(tourCode) => {
                  form.setFieldValue('tourCode', tourCode ?? '');
                  form.setFieldValue('departureCode', '');
                  form.setFieldValue('pricingSelections', []);
                }}
                placeholder={t('createDialog.tourPlaceholder')}
                data={tours.map((tour) => ({
                  value: tour.code,
                  label: `${tour.name} — ${tour.code}`,
                }))}
                searchable
                nothingFoundMessage={t('createDialog.tourPlaceholder')}
                disabled={toursQuery.isPending}
                error={form.errors.tourCode}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Select
                label={t('createDialog.departureLabel')}
                value={form.values.departureCode}
                onChange={(departureCode) => {
                  form.setFieldValue('departureCode', departureCode ?? '');
                  form.setFieldValue('pricingSelections', []);
                }}
                placeholder={t('createDialog.departurePlaceholder')}
                data={openDepartures.map((departure) => ({
                  value: departure.code,
                  label: `${formatBookingDate(departure.startAt, intlLocale)} — ${departure.code}`,
                }))}
                disabled={!form.values.tourCode || departuresQuery.isPending}
                nothingFoundMessage={t('createDialog.departureEmpty')}
                error={form.errors.departureCode}
              />
            </Grid.Col>
          </Grid>

          <TextInput
            label={t('createDialog.seatsLabel')}
            value={form.values.reservedSeats}
            onChange={(event) => form.setFieldValue('reservedSeats', event.currentTarget.value)}
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            dir="ltr"
            error={form.errors.reservedSeats}
          />

          <Stack gap={4}>
            <Text size="sm">{t('createDialog.pricingLabel')}</Text>
            {!form.values.departureCode ? (
              <Text size="sm" c="dimmed">
                {t('createDialog.departureNone')}
              </Text>
            ) : pricesQuery.isPending ? (
              <Text size="sm" c="dimmed">
                {t('page.loading')}
              </Text>
            ) : pricesQuery.isError ? (
              <Text size="sm" c="red">
                {getBookingErrorMessage(pricesQuery.error, t)}
              </Text>
            ) : priceLines.length === 0 ? (
              <Text size="sm" c="dimmed">
                {t('createDialog.pricingNone')}
              </Text>
            ) : (
              <Stack gap="xs">
                {priceLines.map((line) => (
                  <Checkbox
                    key={line.pricingOptionCode}
                    checked={form.values.pricingSelections.includes(line.pricingOptionCode)}
                    onChange={(event) =>
                      togglePricing(line.pricingOptionCode, event.currentTarget.checked)
                    }
                    label={
                      <PricingLineLabel line={line} seats={Number.isFinite(seats) ? seats : 0} />
                    }
                  />
                ))}
                {form.errors.pricingSelections ? (
                  <Text size="sm" c="red">
                    {form.errors.pricingSelections}
                  </Text>
                ) : null}
              </Stack>
            )}
          </Stack>

          <Group justify="space-between" gap="sm">
            <Text size="sm">{t('createDialog.previewTotal')}</Text>
            <Text size="md" fw={600} ff="monospace">
              {estimatedTotal === null
                ? '—'
                : formatBookingAmount(estimatedTotal, currency, intlLocale)}
            </Text>
          </Group>

          <Textarea
            label={t('createDialog.notesLabel')}
            placeholder={t('createDialog.notesPlaceholder')}
            autosize
            minRows={3}
            {...form.getInputProps('notes')}
          />

          {errorMessage ? (
            <Text size="sm" c="red" role="alert">
              {errorMessage}
            </Text>
          ) : null}
        </Stack>

        <FormActions
          submitLabel={t('createDialog.submit')}
          onCancel={onClose}
          submitting={create.isPending}
        />
      </form>

      {quickCreateKeyword !== null ? (
        <QuickCreateDialog
          opened
          onClose={() => setQuickCreateKeyword(null)}
          title={t('customerQuickCreate.title')}
          submitLabel={t('customerQuickCreate.submit')}
          submitting={createCustomer.isPending}
          onSubmit={quickCreateSubmit}
        >
          <Text size="sm" c="dimmed">
            {t('customerQuickCreate.description')}
          </Text>
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label={t('fields.firstName', { ns: 'customers' })}
                {...customerForm.getInputProps('firstName')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label={t('fields.lastName', { ns: 'customers' })}
                {...customerForm.getInputProps('lastName')}
              />
            </Grid.Col>
          </Grid>
          <TextInput
            label={t('fields.email', { ns: 'customers' })}
            {...customerForm.getInputProps('email')}
          />
        </QuickCreateDialog>
      ) : null}
    </>
  );
}

function PricingLineLabel({ line, seats }: { line: DeparturePriceItem; seats: number }) {
  const { t } = useTranslation(['bookings', 'pricing']);
  const intlLocale = getIntlLocale(useAppLocale());
  const perUnit =
    line.basis === 'per_person'
      ? `${t('basis.per_person', { ns: 'pricing' })} × ${seats}`
      : t('basis.per_booking', { ns: 'pricing' });

  return (
    <Stack gap={2}>
      <Text size="sm" fw={500}>
        {line.pricingOptionName}
      </Text>
      <Text size="xs" c="dimmed">
        {perUnit} · {formatBookingAmount(line.amount, line.currency, intlLocale)}
      </Text>
    </Stack>
  );
}
