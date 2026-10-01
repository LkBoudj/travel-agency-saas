import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from '@mantine/core';
import { CellStack } from '../../../components/cell-stack.tsx';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { EmptyState, ErrorState } from '../../../components/empty-state.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { useAppLocale } from '../../../i18n/hooks/use-app-locale.ts';
import { getIntlLocale } from '../../../i18n/locales.ts';
import {
  bookingCustomerName,
  formatBookingAmount,
  formatBookingDate,
} from '../lib/booking-display.ts';
import type { AgencyBooking } from '../types.ts';

/** Figures that sit in a column must not shift width as they change. */
const TABULAR: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

export interface BookingsTableProps {
  bookings: AgencyBooking[];
  loading?: boolean;
  skeletonRows?: number;
  isError?: boolean;
  onRetry?: () => void;
  onViewDetails: (booking: AgencyBooking) => void;
  /** The next action for the empty listing; the page owns the handler. */
  emptyAction?: ReactNode;
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
  skeletonRows,
  isError,
  onRetry,
  onViewDetails,
  emptyAction,
}: BookingsTableProps) {
  const { t } = useTranslation('bookings');
  const intlLocale = getIntlLocale(useAppLocale());

  const columns: DataTableColumn<AgencyBooking>[] = [
    {
      key: 'code',
      header: t('columns.code'),
      w: '30%',
      render: (booking) => (
        <CellStack
          primary={booking.code}
          secondary={booking.tour.name}
          primaryProps={{ ff: 'monospace', size: 'sm' }}
        />
      ),
    },
    {
      key: 'customer',
      header: t('columns.customer'),
      render: (booking) => (
        <CellStack
          primary={bookingCustomerName(booking.customer)}
          secondary={booking.customer.code}
          primaryProps={{ size: 'sm' }}
        />
      ),
    },
    {
      key: 'departure',
      header: t('columns.departure'),
      render: (booking) => (
        <CellStack
          primary={formatBookingDate(booking.departure.startAt, intlLocale)}
          secondary={booking.departure.code}
          secondaryProps={{ ff: 'monospace' }}
        />
      ),
    },
    {
      key: 'seats',
      header: t('columns.seats'),
      render: (booking) => (
        <Text size="sm" ta="end" style={TABULAR}>
          {booking.reservedSeats}
        </Text>
      ),
    },
    {
      key: 'total',
      header: t('columns.total'),
      render: (booking) => (
        <Text size="sm" ff="monospace" ta="end" textWrap="nowrap">
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
      caption={t('columns.tableCaption')}
      minWidth={880}
      stickyHeader
      loading={loading}
      skeletonRows={skeletonRows}
      onRowClick={onViewDetails}
      rowLabel={(booking) => t('page.openRow', { code: booking.code })}
      emptyState={
        // An empty listing states what to do next, not just that it is empty.
        <EmptyState
          title={t('page.empty')}
          description={t('page.emptyBody')}
          action={emptyAction}
        />
      }
    />
  );
}
