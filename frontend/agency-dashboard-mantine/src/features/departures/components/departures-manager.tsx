import { useState, type CSSProperties } from 'react';
import { IconAlertTriangle, IconCoins, IconPencil, IconPlus, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useConfirmDialog } from '../../../components/confirm-dialog.tsx';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { EmptyState, ErrorState } from '../../../components/empty-state.tsx';
import { RowActionsMenu } from '../../../components/row-actions-menu.tsx';
import { SectionHeader } from '../../../components/section-header.tsx';
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

/** Figures that sit in a column must not shift width as they change. */
const TABULAR: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

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
  const { t: tCommon } = useTranslation('common');
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
        <Text size="sm" ta="end" style={TABULAR}>
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
          <RowActionsMenu
            label={`${t('menu')} ${departure.code}`}
            actions={[
              ...(canUpdate
                ? [
                    {
                      key: 'edit',
                      label: t('edit'),
                      icon: <IconPencil size={16} />,
                      onClick: () => openEdit(departure),
                    },
                  ]
                : []),
              ...(canManagePrices
                ? [
                    {
                      key: 'prices',
                      label: t('prices'),
                      icon: <IconCoins size={16} />,
                      onClick: () => setPricing(departure),
                    },
                  ]
                : []),
              ...(canCancel
                ? [
                    {
                      key: 'cancel',
                      label: t('cancel'),
                      icon: <IconX size={16} />,
                      color: 'red',
                      onClick: () => confirmCancel(departure),
                    },
                  ]
                : []),
            ]}
          />
        );
      },
    },
  ];

  return (
    <Stack gap="md">
      <SectionHeader
        title={t('title')}
        description={`${t('subtitle')} · ${t(`availability.${tourModeKey}`)}`}
        count={
          <Text size="sm" c="dimmed" aria-live="polite">
            {tCommon('list.results', { count: departures.length })}
          </Text>
        }
        actions={
          canCreate ? (
            <Button leftSection={<IconPlus size={16} />} size="sm" onClick={openCreate}>
              {t('create')}
            </Button>
          ) : null
        }
      />

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
          caption={t('columns.tableCaption')}
          minWidth={900}
          stickyHeader
          loading={departuresQuery.isPending}
          skeletonRows={4}
          emptyState={
            <EmptyState
              compact
              title={t('empty')}
              action={
                canCreate ? (
                  <Button size="sm" leftSection={<IconPlus size={16} />} onClick={openCreate}>
                    {t('create')}
                  </Button>
                ) : null
              }
            />
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
