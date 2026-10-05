import type { CSSProperties, ReactNode } from 'react';
import { IconEye } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Avatar, Group, Text } from '@mantine/core';
import { CellStack } from '../../../components/cell-stack.tsx';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { EmptyState, ErrorState } from '../../../components/empty-state.tsx';
import { RowActionsMenu } from '../../../components/row-actions-menu.tsx';
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
      w: '24%',
      render: (booking) => (
        <CellStack
          primary={booking.code}
          secondary={booking.tour.name}
          primaryProps={{ ff: 'monospace', size: 'sm', fw: 500 }}
        />
      ),
    },
    {
      key: 'customer',
      header: t('columns.customer'),
      render: (booking) => {
        const name = bookingCustomerName(booking.customer);
        const initials =
          (booking.customer.firstName?.[0] ?? 'C') + (booking.customer.lastName?.[0] ?? 'U');
        return (
          <Group gap="sm" wrap="nowrap">
            <Avatar
              size={28}
              radius="xl"
              color="blue"
              styles={{
                placeholder: {
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 600,
                },
              }}
            >
              {initials.toUpperCase()}
            </Avatar>
            <CellStack
              primary={name}
              secondary={booking.customer.code}
              primaryProps={{ size: 'sm', fw: 500 }}
            />
          </Group>
        );
      },
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
    {
      key: 'actions',
      header: '',
      w: 48,
      render: (booking) => (
        <RowActionsMenu
          label={t('page.openRow', { code: booking.code })}
          actions={[
            {
              key: 'view',
              label: t('details.viewDetails', { defaultValue: 'View details' }),
              icon: <IconEye size={16} />,
              onClick: () => onViewDetails(booking),
            },
          ]}
        />
      ),
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
