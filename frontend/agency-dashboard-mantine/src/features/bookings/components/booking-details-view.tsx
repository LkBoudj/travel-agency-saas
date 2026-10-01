import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge, Button, Divider, Group, Stack, Table, Text, Title } from '@mantine/core';
import { dashboardPaths } from '../../../app/router/route-paths.ts';
import { ErrorState } from '../../../components/empty-state.tsx';
import { PageHeader } from '../../../components/page-header.tsx';
import { Panel } from '../../../components/panel.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { useAppLocale } from '../../../i18n/hooks/use-app-locale.ts';
import { useIsRtl } from '../../../i18n/hooks/use-is-rtl.ts';
import { getIntlLocale } from '../../../i18n/locales.ts';
import type { BookingDetailsPageController } from '../hooks/use-booking-details-page.ts';
import { bookingRowActions } from '../lib/booking-actions.ts';
import {
  bookingCustomerName,
  formatBookingAmount,
  formatBookingDate,
} from '../lib/booking-display.ts';
import type { BookingDetail, BookingStatusHistoryEntry } from '../types.ts';
import { TravelersManager } from './travelers-manager.tsx';

/**
 * One booking's ledger: the summary card, the frozen price snapshot, the
 * lifecycle history and the traveler manifest. Cancelled bookings stay fully
 * readable so a stored link keeps working.
 */
export function BookingDetailsView({
  agencyCode,
  controller,
}: {
  agencyCode: string;
  controller: BookingDetailsPageController;
}) {
  const { t } = useTranslation('bookings');
  // The back arrow is directional: it turns with the reading direction.
  const isRtl = useIsRtl();
  const bookingQuery = controller.booking;
  const booking = bookingQuery.data ?? null;
  const capabilities = controller.capabilities;
  const actions = booking ? bookingRowActions(booking, capabilities) : null;

  return (
    <Stack gap="lg">
      <Link
        to={dashboardPaths.bookings(agencyCode)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
      >
        <Text
          size="sm"
          c="dimmed"
          component="span"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          {isRtl ? <IconArrowRight size={14} /> : <IconArrowLeft size={14} />}
          {t('details.backToList')}
        </Text>
      </Link>

      {bookingQuery.isPending ? (
        <Text size="sm" c="dimmed">
          {t('page.loading')}
        </Text>
      ) : bookingQuery.isError ? (
        <ErrorState title={t('details.loadError')} onRetry={() => void bookingQuery.refetch()} />
      ) : booking ? (
        <>
          <PageHeader
            title={booking.code}
            subtitle={booking.tour.name}
            actions={
              actions && (actions.canConfirm || actions.canCancel) ? (
                <Group gap="sm">
                  {actions.canConfirm ? (
                    <Button onClick={controller.openConfirm}>{t('details.confirm')}</Button>
                  ) : null}
                  {actions.canCancel ? (
                    <Button color="red" variant="light" onClick={controller.openCancel}>
                      {t('details.cancel')}
                    </Button>
                  ) : null}
                </Group>
              ) : null
            }
          />

          <SummaryCard booking={booking} />
          <PriceLinesCard booking={booking} />
          {capabilities.traveler.canView ? (
            <TravelersManager booking={booking} capabilities={capabilities} />
          ) : null}
          <StatusHistoryCard booking={booking} />
        </>
      ) : null}
    </Stack>
  );
}

function SummaryCard({ booking }: { booking: BookingDetail }) {
  const { t } = useTranslation('bookings');
  const intlLocale = getIntlLocale(useAppLocale());

  return (
    <Panel>
      <Group justify="space-between" align="center" wrap="nowrap">
        <Stack gap={2}>
          <Title order={2} fz="xs" c="dimmed" tt="uppercase" fw={600}>
            {t('details.sectionSummary')}
          </Title>
          <Text size="sm" c="dimmed">
            {t('details.seatCount', { count: booking.reservedSeats })}
          </Text>
        </Stack>
        <StatusBadge status={booking.status} />
      </Group>

      <Divider my="sm" />

      <Stack gap="xs">
        <Row
          label={t('details.customer')}
          value={`${bookingCustomerName(booking.customer)} · ${booking.customer.code}`}
        />
        <Row label={t('details.tour')} value={`${booking.tour.name} · ${booking.tour.code}`} />
        <Row
          label={t('details.departure')}
          value={`${formatBookingDate(booking.departure.startAt, intlLocale)} · ${booking.departure.code}`}
        />
        <Row
          label={t('details.total')}
          value={formatBookingAmount(booking.totalAmount, booking.currency, intlLocale)}
        />
        <Row label={t('details.notes')} value={booking.notes?.trim() || t('details.notesEmpty')} />
        <Row
          label={t('details.created')}
          value={formatBookingDate(booking.createdAt, intlLocale)}
        />
        {booking.confirmedAt ? (
          <Row
            label={t('details.confirmed')}
            value={formatBookingDate(booking.confirmedAt, intlLocale)}
          />
        ) : null}
        {booking.cancelledAt ? (
          <Row
            label={t('details.cancelled')}
            value={formatBookingDate(booking.cancelledAt, intlLocale)}
          />
        ) : null}
        {booking.cancellationReason ? (
          <Row label={t('details.cancellationReason')} value={booking.cancellationReason} />
        ) : null}
      </Stack>
    </Panel>
  );
}

function PriceLinesCard({ booking }: { booking: BookingDetail }) {
  const { t } = useTranslation('bookings');
  const intlLocale = getIntlLocale(useAppLocale());

  return (
    <Panel>
      <Title order={2} fz="xs" c="dimmed" tt="uppercase" fw={600} mb="sm">
        {t('details.sectionPricing')}
      </Title>
      {booking.priceLines.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('details.pricingEmpty')}
        </Text>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('columns.tour')}</Table.Th>
              <Table.Th>{t('columns.seats')}</Table.Th>
              <Table.Th>{t('columns.total')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {booking.priceLines.map((line) => (
              <Table.Tr key={line.pricingOptionCode}>
                <Table.Td>
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>
                      {line.pricingOptionName}
                    </Text>
                    <Text size="xs" c="dimmed" ff="monospace">
                      {line.pricingOptionCode}
                    </Text>
                  </Stack>
                </Table.Td>
                <Table.Td>
                  <Stack gap={0}>
                    <Text size="sm">{line.quantity}</Text>
                    <Text size="xs" c="dimmed">
                      {line.basis === 'per_person'
                        ? t('details.basisPerson')
                        : t('details.basisBooking')}
                    </Text>
                  </Stack>
                </Table.Td>
                <Table.Td>
                  <Stack gap={0} align="flex-end">
                    <Text size="sm" ff="monospace">
                      {formatBookingAmount(line.lineTotal, line.currency, intlLocale)}
                    </Text>
                    <Text size="xs" c="dimmed" ff="monospace">
                      @ {formatBookingAmount(line.unitAmount, line.currency, intlLocale)}
                    </Text>
                  </Stack>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Panel>
  );
}

function StatusHistoryCard({ booking }: { booking: BookingDetail }) {
  const { t } = useTranslation('bookings');
  const intlLocale = getIntlLocale(useAppLocale());

  return (
    <Panel>
      <Title order={2} fz="xs" c="dimmed" tt="uppercase" fw={600} mb="sm">
        {t('details.sectionHistory')}
      </Title>
      {booking.statusHistory.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('details.historyEmpty')}
        </Text>
      ) : (
        <Stack gap="sm">
          {booking.statusHistory.map((entry, index) => (
            <HistoryRow key={index} entry={entry} intlLocale={intlLocale} />
          ))}
        </Stack>
      )}
    </Panel>
  );
}

function HistoryRow({
  entry,
  intlLocale,
}: {
  entry: BookingStatusHistoryEntry;
  intlLocale: string;
}) {
  return (
    <Group gap="sm" align="flex-start" wrap="nowrap">
      <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
        {entry.fromStatus ? <StatusBadge status={entry.fromStatus} /> : <StatusFragment />}
        <Text size="xs" c="dimmed">
          →
        </Text>
        <StatusBadge status={entry.toStatus} />
      </Group>
      <Stack gap={0} style={{ minWidth: 0 }}>
        <Text size="xs" c="dimmed">
          {formatBookingDate(entry.createdAt, intlLocale)}
        </Text>
        {entry.reason ? (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {entry.reason}
          </Text>
        ) : null}
      </Stack>
    </Group>
  );
}

function StatusFragment() {
  return (
    <Badge variant="default" color="gray" tt="none">
      —
    </Badge>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" gap="sm" wrap="nowrap">
      <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
        {label}
      </Text>
      <Text size="sm" ta="end" style={{ minWidth: 0 }}>
        {value}
      </Text>
    </Group>
  );
}
