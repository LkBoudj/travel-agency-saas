import { useTranslation } from 'react-i18next';
import { Badge, Text } from '@mantine/core';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { EmptyState } from '../../../components/empty-state.tsx';
import { useAppLocale } from '../../../i18n/hooks/use-app-locale.ts';
import { getIntlLocale } from '../../../i18n/locales.ts';
import { formatPaymentAmount, formatPaymentDate } from '../lib/payment-payloads.ts';
import type { Payment } from '../types.ts';

export interface PaymentHistoryTableProps {
  payments: Payment[];
  currency: string;
  loading?: boolean;
}

export function PaymentHistoryTable({
  payments,
  currency,
  loading = false,
}: PaymentHistoryTableProps) {
  const { t } = useTranslation('payments');
  const locale = getIntlLocale(useAppLocale());

  const columns: DataTableColumn<Payment>[] = [
    {
      key: 'code',
      header: t('history.columns.code'),
      w: '20%',
      render: (payment) => (
        <Text size="sm" ff="monospace" fw={600}>
          {payment.code}
        </Text>
      ),
    },
    {
      key: 'date',
      header: t('history.columns.date'),
      w: '20%',
      render: (payment) => <Text size="sm">{formatPaymentDate(payment.paidAt, locale)}</Text>,
    },
    {
      key: 'amount',
      header: t('history.columns.amount'),
      w: '15%',
      render: (payment) => (
        <Text size="sm" fw={600} c="teal" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatPaymentAmount(payment.amount, payment.currency || currency, locale)}
        </Text>
      ),
    },
    {
      key: 'method',
      header: t('history.columns.method'),
      w: '15%',
      render: (payment) =>
        payment.method ? (
          <Badge size="sm" variant="outline" color="gray">
            {t(`methods.${payment.method}`, payment.method)}
          </Badge>
        ) : (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ),
    },
    {
      key: 'reference',
      header: t('history.columns.reference'),
      w: '15%',
      render: (payment) => (
        <Text size="sm" c={payment.reference ? undefined : 'dimmed'}>
          {payment.reference ?? '—'}
        </Text>
      ),
    },
    {
      key: 'note',
      header: t('history.columns.note'),
      w: '15%',
      render: (payment) => (
        <Text size="sm" c={payment.note ? undefined : 'dimmed'} lineClamp={1}>
          {payment.note ?? '—'}
        </Text>
      ),
    },
  ];

  return (
    <DataTable
      rows={payments}
      columns={columns}
      keyOf={(p) => p.code}
      loading={loading}
      minWidth={600}
      emptyState={<EmptyState title={t('history.empty')} description={t('selectBookingPrompt')} />}
    />
  );
}
