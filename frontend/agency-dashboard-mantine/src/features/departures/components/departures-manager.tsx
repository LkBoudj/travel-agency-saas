import { useState } from 'react';
import {
  IconAlertTriangle,
  IconCoins,
  IconDots,
  IconPencil,
  IconPlus,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Alert, Button, Group, Menu, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useConfirmDialog } from '../../../components/confirm-dialog.tsx';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { ErrorState } from '../../../components/empty-state.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { useAppLocale } from '../../../i18n/hooks/use-app-locale.ts';
import { getIntlLocale } from '../../../i18n/locales.ts';
import { DeparturePricesDialog } from '../../pricing/components/departure-prices-dialog.tsx';
import type { TourStatus } from '../../trips/types.ts';
import { useDepartures, useDeparturesMutations } from '../hooks/use-departures.ts';
import { formatDepartureDate, formatDepartureDateTime } from '../lib/departure-display.ts';
import { getDepartureErrorMessage } from '../lib/departure-error-messages.ts';
import { openDepartureCount } from '../lib/departure-payloads.ts';
import type { DepartureFormValues } from '../schemas/departure.schema.ts';
import type { Departure, DepartureStatus } from '../types.ts';
import { DepartureFormDialog } from './departure-form-dialog.tsx';

interface DeparturesManagerProps {
  tourCode: string;
  tourStatus: TourStatus;
  canCreate: boolean;
  canUpdate: boolean;
  canCancel: boolean;
  canManagePrices: boolean;
  tourModeKey: string;
}

export function DeparturesManager({
  tourCode,
  tourStatus,
  canCreate,
  canUpdate,
  canCancel,
  canManagePrices,
  tourModeKey,
}: DeparturesManagerProps) {
  const { t } = useTranslation('departures');
  const amai = getIntlLocale(useAppLocale());
  const confirmRp = useConfirmDialog();

  const departuresQuery = useDepartures(tourCode);
  const { create, update, cancel } = useDeparturesMutations(tourCode);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Departure | null>(null);
  const [pricing, setPricing] = useState<Departure | null>(null);

  const departures = departuresQuery.data ?? [];
  const openCount = openDepartureCount(departures);
  const isPublished = tourStatus === 'PUBLISHED';
  const showNoOpenWarning = isPublished && !departuresQuery.isPending && openCount === 0;

  const notifyError = (error: unknown) => {
    notifications.show({ message: getDepartureErrorMessage(error, t), color: 'red' });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (departure: Departure) => {
    if (departure.status === 'CANCELLED') {
      return;
    }
    setEditing(departure);
    setFormOpen(true);
  };

  const submitForm = (values: DepartureFormValues, status: DepartureStatus) => {
    if (editing) {
      update.mutate(
        { departureCode: editing.code, values, status },
        {
          onSuccess: () => {
            setFormOpen(false);
            notifications.show({ message: t('editDialog.success'), color: 'teal' });
          },
          onError: notifyError,
        }
      );
      return;
    }
    create.mutate(
      { values },
      {
        onSuccess: () => {
          setFormOpen(false);
          notifications.show({ message: t('createDialog.success'), color: 'teal' });
        },
        onError: notifyError,
      }
    );
  };

  const confirmCancel = (departure: Departure) =>
    confirmRp({
      title: t('confirm.cancelTitle', { name: departure.code }),
      message: t('confirm.cancelBody'),
      color: 'red',
      onConfirm: () =>
        cancel.mutate(
          { departureCode: departure.code },
          {
            onSuccess: () =>
              notifications.show({ message: t('notifications.cancelled'), color: 'teal' }),
            onError: notifyError,
          }
        ),
    });

  const columns: DataTableColumn<Departure>[] = [
    {
      key: 'status',
      header: t('columns.status'),
      render: (departure) => <StatusBadge status={departure.status} />,
    },
    {
      key: 'start',
      header: t('columns.start'),
      render: (departure) => (
        <Text size="sm" textWrap="nowrap">
          {formatDepartureDateTime(departure.startAt, amai)}
        </Text>
      ),
    },
    {
      key: 'end',
      header: t('columns.end'),
      render: (departure) => (
        <Text size="sm" c="dimmed" textWrap="nowrap">
          {formatDepartureDateTime(departure.endAt, amai)}
        </Text>
      ),
    },
    {
      key: 'capacity',
      header: t('columns.capacity'),
      render: (departure) => (
        <Text size="sm" ta="right" tabular-nums>
          {departure.capacity}
        </Text>
      ),
    },
    {
      key: 'deadline',
      header: t('columns.deadline'),
      render: (departure) =>
        departure.bookingDeadline ? (
          <Text size="sm" c="dimmed" textWrap="nowrap">
            {formatDepartureDate(departure.bookingDeadline, amai)}
          </Text>
        ) : (
          <Text size="sm" c="dimmed">
            {t('deadlineNone')}
          </Text>
        ),
    },
    {
      key: 'actions',
      header: '',
      w: 48,
      render: (departure) => {
        if (departure.status === 'CANCELLED') {
          return null;
        }
        if (!canUpdate && !canManagePrices && !canCancel) {
          return null;
        }
        return (
          <Menu withinPortal position="bottom-end" shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label={`${t('menu')} ${departure.code}`}
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {canUpdate ? (
                <Menu.Item
                  leftSection={<IconPencil size={16} />}
                  onClick={() => openEdit(departure)}
                >
                  {t('edit')}
                </Menu.Item>
              ) : null}
              {canManagePrices ? (
                <Menu.Item
                  leftSection={<IconCoins size={16} />}
                  onClick={() => setPricing(departure)}
                >
                  {t('prices')}
                </Menu.Item>
              ) : null}
              {canCancel ? (
                <Menu.Item
                  leftSection={<IconX size={16} />}
                  color="red"
                  onClick={() => confirmCancel(departure)}
                >
                  {t('cancel')}
                </Menu.Item>
              ) : null}
            </Menu.Dropdown>
          </Menu>
        );
      },
    },
  ];

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <Stack gap={2}>
          <Title order={3}>{t('title')}</Title>
          <Text size="sm" c="dimmed">
            {t('subtitle')} · {t(`availability.${tourModeKey}`)}
          </Text>
        </Stack>
        {canCreate ? (
          <Button leftSection={<IconPlus size={16} />} size="sm" onClick={openCreate}>
            {t('create')}
          </Button>
        ) : null}
      </Group>

      {showNoOpenWarning ? (
        <Alert
          variant="light"
          color="orange"
          icon={<IconAlertTriangle size={18} />}
          title={t('publishedNoOpen.title')}
        >
          {t('publishedNoOpen.body')}
        </Alert>
      ) : null}

      {departuresQuery.isError ? (
        <ErrorState title={t('loadError')} onRetry={() => void departuresQuery.refetch()} />
      ) : (
        <DataTable
          rows={departures}
          columns={columns}
          keyOf={(departure) => departure.code}
          loading={departuresQuery.isPending}
          emptyState={
            <Stack align="center" gap="sm" py="sm">
              <Text size="sm" c="dimmed">
                {t('empty')}
              </Text>
              {canCreate ? (
                <Button size="sm" onClick={openCreate}>
                  <IconPlus size={16} />
                  {t('create')}
                </Button>
              ) : null}
            </Stack>
          }
        />
      )}

      {formOpen ? (
        <DepartureFormDialog
          departure={editing}
          submitting={create.isPending || update.isPending}
          onClose={() => setFormOpen(false)}
          onSubmit={submitForm}
        />
      ) : null}

      {pricing ? (
        <DeparturePricesDialog
          tourCode={tourCode}
          departure={pricing}
          onClose={() => setPricing(null)}
        />
      ) : null}
    </Stack>
  );
}
