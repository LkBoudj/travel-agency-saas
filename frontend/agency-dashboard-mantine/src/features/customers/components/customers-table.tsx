import dayjs from 'dayjs';
import { IconArchive, IconDots, IconPencil } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Avatar, Group, Menu, Stack, Text } from '@mantine/core';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { ErrorState } from '../../../components/empty-state.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
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
}: CustomersTableProps) {
  const { t } = useTranslation('customers');

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
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text fw={500} truncate>
              {customerDisplayName(customer)}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {customer.email ?? customer.code}
            </Text>
          </Stack>
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
          {dayjs(customer.createdAt).format('ll')}
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
          <Menu withinPortal position="bottom-end" shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={t('menu')}>
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {canUpdate ? (
                <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onEdit(customer)}>
                  {t('edit')}
                </Menu.Item>
              ) : null}
              {canArchive ? (
                <Menu.Item
                  leftSection={<IconArchive size={16} />}
                  color="red"
                  onClick={() => onArchive(customer)}
                >
                  {t('archive')}
                </Menu.Item>
              ) : null}
            </Menu.Dropdown>
          </Menu>
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
      loading={loading}
      emptyState={t('customersEmpty')}
    />
  );
}
