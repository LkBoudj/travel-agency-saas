import { useEffect, useState } from 'react';
import { IconCurrencyDollar } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Group, Loader, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ErrorState } from '../../../components/empty-state.tsx';
import { FormActions } from '../../../components/form/form-actions.tsx';
import { ModalFormShell } from '../../../components/form/modal-form-shell.tsx';
import {
  useDeparturePrices,
  usePricingOverview,
  usePricingMutations,
} from '../hooks/use-pricing.ts';
import { getPricingErrorMessage } from '../lib/pricing-error-messages.ts';
import {
  buildDeparturePricesPayload,
  toDeparturePriceRows,
  type DeparturePriceRow,
} from '../lib/pricing-payloads.ts';
import { departurePricesSchema } from '../schemas/departure-prices.schema.ts';
import type { DepartureSummary } from '../types/departure-summary.ts';

export interface DeparturePricesDialogProps {
  tourCode: string;
  departure: DepartureSummary;
  onClose: () => void;
}

/**
 * The per-departure prices dialog. One editable amount per ACTIVE pricing
 * option; an empty amount means "no price here". Saving replaces the whole
 * price set, which also refreshes the tour's derived `startingPrice`.
 */
export function DeparturePricesDialog({
  tourCode,
  departure,
  onClose,
}: DeparturePricesDialogProps) {
  const { t } = useTranslation('pricing');

  const overviewQuery = usePricingOverview(tourCode);
  const pricesQuery = useDeparturePrices(tourCode, departure.code);
  const { setPrices } = usePricingMutations(tourCode);

  const [rows, setRows] = useState<DeparturePriceRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const loading = overviewQuery.isPending || pricesQuery.isPending;
  const error = overviewQuery.isError ? overviewQuery.error : pricesQuery.error;

  // Run this after both queries settle; the options define the rows.
  useEffect(() => {
    if (loading || error) {
      return;
    }
    setRows(toDeparturePriceRows(overviewQuery.data?.options ?? [], pricesQuery.data));
  }, [loading, error, overviewQuery.data, pricesQuery.data]);

  const setAmount = (pricingOptionCode: string, amount: string) => {
    setFormError(null);
    setRows((current) =>
      current.map((row) => (row.pricingOptionCode === pricingOptionCode ? { ...row, amount } : row))
    );
  };

  const handleSubmit = () => {
    const result = departurePricesSchema.safeParse({ prices: rows });
    if (!result.success) {
      setFormError(t('pricesDialog.invalidAmount'));
      return;
    }
    setPrices.mutate(
      { departureCode: departure.code, rows },
      {
        onSuccess: () => {
          const payload = buildDeparturePricesPayload(rows);
          notifications.show({
            message:
              payload.prices.length > 0
                ? t('pricesDialog.success')
                : t('pricesDialog.clearSuccess'),
            color: 'teal',
          });
          onClose();
        },
        onError: (error) => {
          setFormError(getPricingErrorMessage(error, t));
          notifications.show({ message: getPricingErrorMessage(error, t), color: 'red' });
        },
      }
    );
  };

  return (
    <ModalFormShell
      opened
      onClose={onClose}
      title={t('pricesDialog.title', { name: departure.code })}
      size="md"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {t('pricesDialog.description')}
          </Text>

          {loading ? (
            <Group justify="center" py="xl">
              <Loader size="sm" />
            </Group>
          ) : error ? (
            <ErrorState title={t('pricesDialog.loadError')} />
          ) : rows.length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              {t('pricesDialog.noOptions')}
            </Text>
          ) : (
            <Stack gap="md">
              {rows.map((row) => {
                const option = overviewQuery.data?.options.find(
                  (item) => item.code === row.pricingOptionCode
                );
                return (
                  <TextInput
                    key={row.pricingOptionCode}
                    label={option?.name ?? row.pricingOptionCode}
                    description={`${t(`basis.${option?.basis}`)} · ${option?.currency ?? ''}`}
                    value={row.amount}
                    onChange={(event) =>
                      setAmount(row.pricingOptionCode, event.currentTarget.value)
                    }
                    leftSection={<IconCurrencyDollar size={16} />}
                    placeholder={t('pricesDialog.amountPlaceholder')}
                    aria-label={t('pricesDialog.amountAria', {
                      name: option?.name ?? row.pricingOptionCode,
                    })}
                    inputMode="decimal"
                  />
                );
              })}
              {formError ? (
                <Text size="sm" c="red">
                  {formError}
                </Text>
              ) : null}
            </Stack>
          )}
        </Stack>

        <FormActions
          submitLabel={t('pricesDialog.submit')}
          onCancel={onClose}
          submitting={setPrices.isPending}
        />
      </form>
    </ModalFormShell>
  );
}
