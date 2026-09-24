import { useTranslation } from 'react-i18next';
import { Group, Stack, Text } from '@mantine/core';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { ErrorState } from '../../../components/empty-state.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { useAppLocale } from '../../../i18n/hooks/use-app-locale.ts';
import { getIntlLocale } from '../../../i18n/locales.ts';
import {
  bookingCustomerName,
  formatBookingAmount,
  formatBookingDate,
} from '../lib/booking-display.ts';
import type { AgencyBooking } from '../types.ts';

export interface BookingsTableProps {
  bookings: AgencyBooking[];
  loading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onViewDetails: (booking: AgencyBooking) => void;
}

/**
 * One row per booking in the listing. The booking code is the record's stable
 * key; the customer and trip names ride as secondary lines. The total is
 * rendered in the booking's own currency and the whole row opens the details
 * page, which owns the heavier lifecycle actions.
 */
export function BookingsTable({
  bookings,
  loading,
  isError,
  onRetry,
  onViewDetails,
}: BookingsTableProps) {
  const { t } = useTranslation('bookings');
  const intlLocale = getIntlLocale(useAppLocale());

  const columns: DataTableColumn<AgencyBooking>[] = [
    {
      key: 'code',
      header: t('columns.code'),
      w: '30%',
      render: (booking) => (
        <Group gap="sm" wrap="nowrap">
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text fw={500} ff="monospace" size="sm" truncate>
              {booking.code}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {booking.tour.name}
            </Text>
          </Stack>
        </Group>
      ),
    },
    {
      key: 'customer',
      header: t('columns.customer'),
      render: (booking) => (
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="sm" truncate>
            {bookingCustomerName(booking.customer)}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {booking.customer.code}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'departure',
      header: t('columns.departure'),
      render: (booking) => (
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="sm" textWrap="nowrap">
            {formatBookingDate(booking.departure.startAt, intlLocale)}
          </Text>
          <Text size="xs" c="dimmed" ff="monospace">
            {booking.departure.code}
          </Text>
        </Stack>
      ),
    },
    {
      key: 'seats',
      header: t('columns.seats'),
      render: (booking) => (
        <Text size="sm" ta="right" tabular-nums>
          {booking.reservedSeats}
        </Text>
      ),
    },
    {
      key: 'total',
      header: t('columns.total'),
      render: (booking) => (
        <Text size="sm" ff="monospace" ta="right" textWrap="nowrap">
          {formatBookingAmount(booking.totalAmount, booking.currency, intlLocale)}
        </Text>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (booking) => <StatusBadge status={booking.status} />,
    },
  ];

  if (isError) {
    return <ErrorState title={t('page.loadError')} onRetry={onRetry} />;
  }

  return (
    <DataTable
      rows={bookings}
      columns={columns}
      keyOf={(booking) => booking.code}
      loading={loading}
      onRowClick={onViewDetails}
      emptyState={t('page.empty')}
    />
  );
}
