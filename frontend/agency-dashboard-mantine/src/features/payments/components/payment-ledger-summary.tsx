import { useTranslation } from 'react-i18next';
import { Badge, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Panel } from '../../../components/panel.tsx';
import { useAppLocale } from '../../../i18n/hooks/use-app-locale.ts';
import { getIntlLocale } from '../../../i18n/locales.ts';
import { formatPaymentAmount } from '../lib/payment-payloads.ts';
import type { PaymentLedger } from '../types.ts';

export interface PaymentLedgerSummaryProps {
  ledger: PaymentLedger;
}

const TABULAR: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
};

export function PaymentLedgerSummary({ ledger }: PaymentLedgerSummaryProps) {
  const { t } = useTranslation('payments');
  const locale = getIntlLocale(useAppLocale());

  const isSettled = ledger.remainingAmount === 0;
  const isPartiallyPaid = ledger.paidAmount > 0 && ledger.remainingAmount > 0;

  const statusBadge = isSettled ? (
    <Badge color="teal" variant="light" size="md">
      {t('summary.settled')}
    </Badge>
  ) : isPartiallyPaid ? (
    <Badge color="blue" variant="light" size="md">
      {t('summary.partiallyPaid')}
    </Badge>
  ) : (
    <Badge color="gray" variant="light" size="md">
      {t('summary.unpaid')}
    </Badge>
  );

  return (
    <Panel>
      <Group justify="space-between" align="center" mb="md" wrap="nowrap">
        <Title order={3} fz="sm" fw={600} c="dimmed" tt="uppercase">
          {t('summary.title')}
        </Title>
        {statusBadge}
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Stack gap={2}>
          <Text size="xs" c="dimmed" fw={500}>
            {t('summary.totalAmount')}
          </Text>
          <Text size="xl" fw={700} style={TABULAR}>
            {formatPaymentAmount(ledger.totalAmount, ledger.currency, locale)}
          </Text>
        </Stack>

        <Stack gap={2}>
          <Text size="xs" c="dimmed" fw={500}>
            {t('summary.paidAmount')}
          </Text>
          <Text size="xl" fw={700} c="teal" style={TABULAR}>
            {formatPaymentAmount(ledger.paidAmount, ledger.currency, locale)}
          </Text>
        </Stack>

        <Stack gap={2}>
          <Text size="xs" c="dimmed" fw={500}>
            {t('summary.remainingAmount')}
          </Text>
          <Text
            size="xl"
            fw={700}
            c={ledger.remainingAmount > 0 ? 'orange' : 'dimmed'}
            style={TABULAR}
          >
            {formatPaymentAmount(ledger.remainingAmount, ledger.currency, locale)}
          </Text>
        </Stack>
      </SimpleGrid>
    </Panel>
  );
}
