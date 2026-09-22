import { Text } from '@mantine/core';
import { useAppLocale } from '../i18n/hooks/use-app-locale.ts';
import { getIntlLocale } from '../i18n/locales.ts';
import { formatMoney } from '../lib/format-money.ts';

export function MoneyText({
  amount,
  currency = 'USD',
  precision,
}: {
  amount: number;
  currency?: string;
  precision?: number;
}) {
  const locale = useAppLocale();
  const intlLocale = getIntlLocale(locale);

  return (
    <Text span fw={600} tabular-nums>
      {formatMoney(amount, intlLocale, { currency, precision })}
    </Text>
  );
}
