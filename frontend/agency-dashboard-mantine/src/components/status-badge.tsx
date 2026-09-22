import { useTranslation } from 'react-i18next';
import { Badge } from '@mantine/core';

const COLOR_BY_KEY: Record<string, string> = {
  active: 'green',
  suspended: 'red',
  archived: 'gray',
  draft: 'gray',
  published: 'cyan',
  open: 'blue',
  closed: 'gray',
  cancelled: 'red',
  pending: 'yellow',
  confirmed: 'teal',
  deactivated: 'gray',
  inactive: 'gray',
  accepted: 'teal',
  revoked: 'gray',
  expired: 'gray',
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('common');
  const key = status.toLowerCase();
  const translated = t(`statuses.${key}`, { defaultValue: status });
  return (
    <Badge color={COLOR_BY_KEY[key] ?? 'gray'} variant="light" tt="none">
      {translated}
    </Badge>
  );
}
