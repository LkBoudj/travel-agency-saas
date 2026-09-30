import { useState } from 'react';
import { IconDots, IconPencil, IconPlus, IconPower } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Badge, Button, Group, Menu, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useConfirmDialog } from '../../../components/confirm-dialog.tsx';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { ErrorState } from '../../../components/empty-state.tsx';
import { MoneyText } from '../../../components/money-text.tsx';
import { useQualifiedKey } from '../../../i18n/hooks/use-qualified-key.ts';
import { usePricingOverview, usePricingMutations } from '../hooks/use-pricing.ts';
import { pricingBasisLabelKey } from '../lib/pricing-display.ts';
import { getPricingErrorMessage } from '../lib/pricing-error-messages.ts';
import type { PricingOptionFormValues } from '../schemas/pricing-option.schema.ts';
import type { PricingOption } from '../types.ts';
import { PricingOptionFormDialog } from './pricing-option-form-dialog.tsx';

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
        <Stack gap={2}>
          <Text size="sm" fw={600}>
            {option.name}
          </Text>
          {option.description ? (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {option.description}
            </Text>
          ) : null}
        </Stack>
      ),
    },
    {
      key: 'basis',
      header: t('columns.basis'),
      // `pricingBasisLabelKey` is fully qualified (`pricing.basis.per_person`),
      // so it must not be handed to this component's namespace-bound `t`.
      render: (option) => <Text size="sm">{qualifiedKey(pricingBasisLabelKey(option.basis))}</Text>,
    },
    {
      key: 'currency',
      header: t('columns.currency'),
      render: (option) => <Text size="sm">{option.currency}</Text>,
    },
    {
      key: 'pricedDepartures',
      header: t('columns.pricedDepartures'),
      render: (option) => (
        <Text size="sm" ta="right" tabular-nums>
          {option.pricedDepartureCount}
        </Text>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (option) => (
        <Badge color={option.status === 'ACTIVE' ? 'green' : 'gray'} variant="light" tt="none">
          {t(`statuses.${option.status.toLowerCase()}`, { ns: 'common' })}
        </Badge>
      ),
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
          <Menu withinPortal position="bottom-end" shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={`${t('menu')} ${option.name}`}>
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {canEdit ? (
                <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => openEdit(option)}>
                  {t('edit')}
                </Menu.Item>
              ) : null}
              {canDeactivate ? (
                <Menu.Item
                  leftSection={<IconPower size={16} />}
                  color="red"
                  onClick={() => confirmDeactivate(option)}
                >
                  {t('deactivate')}
                </Menu.Item>
              ) : null}
            </Menu.Dropdown>
          </Menu>
        );
      },
    },
  ];

  const startingPrice = overviewQuery.data?.startingPrice;
  const pricedDepartures = overviewQuery.data?.pricedOpenDepartureCount ?? 0;
  const tourCurrency = options[0]?.currency;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <Stack gap={2}>
          <Title order={3}>{t('section.title')}</Title>
          <Text size="sm" c="dimmed">
            {t('section.helper')}
          </Text>
        </Stack>
        {canCreate ? (
          <Button leftSection={<IconPlus size={16} />} size="sm" onClick={openCreate}>
            {t('create')}
          </Button>
        ) : null}
      </Group>

      <Group gap="lg">
        <Stack gap={0}>
          <Text size="xs" tt="uppercase" c="dimmed" fw={600}>
            {t('columns.option')}
          </Text>
          <Text size="lg" fw={700}>
            {t('summary.optionsCount', { count: options.length })}
          </Text>
        </Stack>
        <Stack gap={0}>
          <Text size="xs" tt="uppercase" c="dimmed" fw={600}>
            {t('summary.startingPrice')}
          </Text>
          {startingPrice != null && tourCurrency ? (
            <MoneyText amount={startingPrice} currency={tourCurrency} />
          ) : (
            <Text size="lg" fw={700}>
              {t('summary.noPrice')}
            </Text>
          )}
        </Stack>
        <Stack gap={0}>
          <Text size="xs" tt="uppercase" c="dimmed" fw={600}>
            {t('columns.pricedDepartures')}
          </Text>
          <Text size="lg" fw={700}>
            {t('summary.pricedDepartures', { count: pricedDepartures })}
          </Text>
        </Stack>
      </Group>

      {overviewQuery.isError ? (
        <ErrorState title={t('loadError')} onRetry={() => void overviewQuery.refetch()} />
      ) : (
        <DataTable
          rows={options}
          columns={columns}
          keyOf={(option) => option.code}
          loading={overviewQuery.isPending}
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
