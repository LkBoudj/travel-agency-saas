import { useState, type CSSProperties } from 'react';
import { IconPencil, IconPlus, IconPower } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, SimpleGrid, Stack } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { CellStack } from '../../../components/cell-stack.tsx';
import { useConfirmDialog } from '../../../components/confirm-dialog.tsx';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { EmptyState, ErrorState } from '../../../components/empty-state.tsx';
import { MoneyText } from '../../../components/money-text.tsx';
import { RowActionsMenu } from '../../../components/row-actions-menu.tsx';
import { SectionHeader } from '../../../components/section-header.tsx';
import { StatCard } from '../../../components/stat-card.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { useQualifiedKey } from '../../../i18n/hooks/use-qualified-key.ts';
import { usePricingOverview, usePricingMutations } from '../hooks/use-pricing.ts';
import { pricingBasisLabelKey } from '../lib/pricing-display.ts';
import { getPricingErrorMessage } from '../lib/pricing-error-messages.ts';
import type { PricingOptionFormValues } from '../schemas/pricing-option.schema.ts';
import type { PricingOption } from '../types.ts';
import { PricingOptionFormDialog } from './pricing-option-form-dialog.tsx';

/** Figures that sit in a column must not shift width as they change. */
const TABULAR: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

interface PricingManagerProps {
  tourCode: string;
  canCreate: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
}

/**
 * The pricing section of the departures page: options + derived numbers.
 *
 * Overview (options list) can be read with just `AGENCY_PRICING_VIEW`; every
 * write action is gated individually. Options are born ACTIVE; the only state
 * change is deactivation (one-way).
 */
export function PricingManager({
  tourCode,
  canCreate,
  canEdit,
  canDeactivate,
}: PricingManagerProps) {
  const { t } = useTranslation('pricing');
  const qualifiedKey = useQualifiedKey();
  const confirm = useConfirmDialog();
  const overviewQuery = usePricingOverview(tourCode);
  const { create, update, deactivate } = usePricingMutations(tourCode);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PricingOption | null>(null);

  const options = overviewQuery.data?.options ?? [];

  const notifyError = (error: unknown) => {
    notifications.show({ message: getPricingErrorMessage(error, t), color: 'red' });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (option: PricingOption) => {
    if (option.status === 'INACTIVE') {
      return;
    }
    setEditing(option);
    setFormOpen(true);
  };

  const submitForm = (values: PricingOptionFormValues) => {
    if (editing) {
      update.mutate(
        { pricingOptionCode: editing.code, values },
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

  const confirmDeactivate = (option: PricingOption) =>
    confirm({
      title: t('confirm.deactivateTitle', { name: option.name }),
      message: t('confirm.deactivateBody'),
      color: 'red',
      onConfirm: () =>
        deactivate.mutate(
          { pricingOptionCode: option.code },
          {
            onSuccess: () =>
              notifications.show({ message: t('notifications.deactivated'), color: 'teal' }),
            onError: notifyError,
          }
        ),
    });

  const columns: DataTableColumn<PricingOption>[] = [
    {
      key: 'option',
      header: t('columns.option'),
      render: (option) => (
        <CellStack
          primary={option.name}
          secondary={option.description}
          primaryProps={{ fw: 600 }}
        />
      ),
    },
    {
      key: 'basis',
      header: t('columns.basis'),
      // `pricingBasisLabelKey` is fully qualified (`pricing.basis.per_person`),
      // so it must not be handed to this component's namespace-bound `t`.
      render: (option) => <CellStack primary={qualifiedKey(pricingBasisLabelKey(option.basis))} />,
    },
    {
      key: 'currency',
      header: t('columns.currency'),
      render: (option) => <CellStack primary={option.currency} />,
    },
    {
      key: 'pricedDepartures',
      header: t('columns.pricedDepartures'),
      render: (option) => (
        <CellStack
          align="end"
          primary={option.pricedDepartureCount}
          primaryProps={{ ta: 'right', style: TABULAR }}
        />
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      // The lifecycle status is shared with the other lists, so it goes through
      // the same badge rather than a hand-picked colour here.
      render: (option) => <StatusBadge status={option.status} />,
    },
    {
      key: 'actions',
      header: '',
      w: 48,
      render: (option) => {
        if (option.status === 'INACTIVE') {
          return null;
        }
        if (!canEdit && !canDeactivate) {
          return null;
        }
        return (
          <RowActionsMenu
            label={`${t('menu')} ${option.name}`}
            actions={[
              ...(canEdit
                ? [
                    {
                      key: 'edit',
                      label: t('edit'),
                      icon: <IconPencil size={16} />,
                      onClick: () => openEdit(option),
                    },
                  ]
                : []),
              ...(canDeactivate
                ? [
                    {
                      key: 'deactivate',
                      label: t('deactivate'),
                      icon: <IconPower size={16} />,
                      color: 'red',
                      onClick: () => confirmDeactivate(option),
                    },
                  ]
                : []),
            ]}
          />
        );
      },
    },
  ];

  const startingPrice = overviewQuery.data?.startingPrice;
  const pricedDepartures = overviewQuery.data?.pricedOpenDepartureCount ?? 0;
  const tourCurrency = options[0]?.currency;

  return (
    <Stack gap="md">
      <SectionHeader
        title={t('section.title')}
        description={t('section.helper')}
        actions={
          canCreate ? (
            <Button
              color="blue"
              leftSection={<IconPlus size={16} />}
              size="sm"
              onClick={openCreate}
              styles={{ root: { backgroundColor: '#1971c2', fontWeight: 600 } }}
            >
              {t('create')}
            </Button>
          ) : null
        }
      />

      {/* The three numbers are the same "one number, one label" shape as the
          overview tiles, at the in-page scale. */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
        <StatCard
          compact
          label={t('summary.optionsLabel')}
          value={t('summary.optionsCount', { count: options.length })}
        />
        <StatCard
          compact
          label={t('summary.startingPrice')}
          value={
            startingPrice != null && tourCurrency ? (
              <MoneyText amount={startingPrice} currency={tourCurrency} />
            ) : (
              t('summary.noPrice')
            )
          }
        />
        <StatCard
          compact
          label={t('columns.pricedDepartures')}
          value={t('summary.pricedDepartures', { count: pricedDepartures })}
        />
      </SimpleGrid>

      {overviewQuery.isError ? (
        <ErrorState title={t('loadError')} onRetry={() => void overviewQuery.refetch()} />
      ) : (
        <DataTable
          rows={options}
          columns={columns}
          keyOf={(option) => option.code}
          caption={t('columns.tableCaption')}
          minWidth={760}
          stickyHeader
          loading={overviewQuery.isPending}
          skeletonRows={3}
          rowLabel={(option) => t('openRow', { name: option.name })}
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
        <PricingOptionFormDialog
          option={editing}
          submitting={create.isPending || update.isPending}
          onClose={() => setFormOpen(false)}
          onSubmit={submitForm}
        />
      ) : null}
    </Stack>
  );
}
