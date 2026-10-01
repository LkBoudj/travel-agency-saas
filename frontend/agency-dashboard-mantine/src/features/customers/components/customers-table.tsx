import type { ReactNode } from 'react';
import { IconArchive, IconPencil } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Avatar, Group, Text } from '@mantine/core';
import { CellStack } from '../../../components/cell-stack.tsx';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { EmptyState, ErrorState } from '../../../components/empty-state.tsx';
import { RowActionsMenu } from '../../../components/row-actions-menu.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { useAppLocale } from '../../../i18n/hooks/use-app-locale.ts';
import { getIntlLocale } from '../../../i18n/locales.ts';
import { formatShortDate } from '../../../lib/format-date.ts';
import { customerDisplayName, customerInitials } from '../lib/customer-display.ts';
import type { Customer } from '../types.ts';

export interface CustomersTableProps {
  customers: Customer[];
  canUpdate: boolean;
  canArchive: boolean;
  loading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEdit: (customer: Customer) => void;
  onArchive: (customer: Customer) => void;
  /** The next action for the empty listing; the page owns the handler. */
  emptyAction?: ReactNode;
}

export function CustomersTable({
  customers,
  canUpdate,
  canArchive,
  loading,
  isError,
  onRetry,
  onEdit,
  onArchive,
  emptyAction,
}: CustomersTableProps) {
  const { t } = useTranslation('customers');
  const intlLocale = getIntlLocale(useAppLocale());

  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'customer',
      header: t('columns.customer'),
      w: '40%',
      render: (customer) => (
        <Group gap="sm" wrap="nowrap">
          <Avatar color="violet" radius="xl" size="md">
            {customerInitials(customer)}
          </Avatar>
          <CellStack
            primary={customerDisplayName(customer)}
            secondary={customer.email ?? customer.code}
          />
        </Group>
      ),
    },
    {
      key: 'contact',
      header: t('columns.contact'),
      render: (customer) => (
        <Text size="sm" c={customer.phone ? undefined : 'dimmed'}>
          {customer.phone ?? '—'}
        </Text>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (customer) => <StatusBadge status={customer.status} />,
    },
    {
      key: 'created',
      header: t('columns.created'),
      render: (customer) => (
        <Text size="sm" c="dimmed">
          {formatShortDate(customer.createdAt, intlLocale)}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: '',
      w: 48,
      render: (customer) => {
        if (!canUpdate && !canArchive) {
          return null;
        }

        return (
          <RowActionsMenu
            actions={[
              ...(canUpdate
                ? [
                    {
                      key: 'edit',
                      label: t('edit'),
                      icon: <IconPencil size={16} />,
                      onClick: () => onEdit(customer),
                    },
                  ]
                : []),
              ...(canArchive
                ? [
                    {
                      key: 'archive',
                      label: t('archive'),
                      icon: <IconArchive size={16} />,
                      color: 'red',
                      onClick: () => onArchive(customer),
                    },
                  ]
                : []),
            ]}
          />
        );
      },
    },
  ];

  if (isError) {
    return <ErrorState title={t('loadError')} onRetry={onRetry} />;
  }

  return (
    <DataTable
      rows={customers}
      columns={columns}
      keyOf={(customer) => customer.code}
      caption={t('columns.tableCaption')}
      minWidth={820}
      stickyHeader
      loading={loading}
      skeletonRows={5}
      rowLabel={(customer) => t('openRow', { name: customerDisplayName(customer) })}
      emptyState={
        // An empty listing states what to do next, not just that it is empty.
        <EmptyState
          title={t('customersEmpty')}
          description={t('customersEmptyBody')}
          action={emptyAction}
        />
      }
    />
  );
}
