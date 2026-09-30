import { useTranslation } from 'react-i18next';
import { Badge } from '@mantine/core';
import { getStatusColor } from '../theme/colors.ts';

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('common');
  const key = status.toLowerCase();
  const translated = t(`statuses.${key}`, { defaultValue: status });
  return (
    <Badge color={getStatusColor(status)} variant="light" tt="none">
      {translated}
    </Badge>
  );
}
