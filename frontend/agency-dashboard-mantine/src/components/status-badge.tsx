import { useTranslation } from 'react-i18next';
import { Badge, Group } from '@mantine/core';
import { getStatusColor } from '../theme/colors.ts';

/**
 * A status chip. `mode` covers the second vocabulary the product needs next to
 * the lifecycle statuses — a tour's availability mode — so those stop being
 * hand-rolled `<Badge>`s that pick their own colours and lose their
 * translations in one namespace.
 */
export function StatusBadge({
  status,
  mode,
  modeNamespace = 'departures',
}: {
  status: string;
  /** Optional second vocabulary (availability, visibility, …). */
  mode?: string;
  /** i18n namespace that owns `mode`; defaults to the departures catalog. */
  modeNamespace?: string;
}) {
  const { t } = useTranslation('common');
  const { t: tMode } = useTranslation(modeNamespace);
  const key = status.toLowerCase();
  const translated = t(`statuses.${key}`, { defaultValue: status });
  return (
    <Group gap={6} wrap="nowrap">
      <Badge color={getStatusColor(status)} variant="light" tt="none">
        {translated}
      </Badge>
      {mode ? (
        <Badge color="gray" variant="light" tt="none">
          {tMode(`availability.${mode}`, { defaultValue: mode })}
        </Badge>
      ) : null}
    </Group>
  );
}
