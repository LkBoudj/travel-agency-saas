import { IconBuildingSkyscraper } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Card, Group, Stack, Text } from '@mantine/core';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { canEnterAgency } from '../lib/agency-paths.ts';
import type { MyAgency } from '../types.ts';

export function AgencyCard({
  agency,
  onSelect,
}: {
  agency: MyAgency;
  onSelect: (agencyCode: string) => void;
}) {
  const { t } = useTranslation('common');
  const enterable = canEnterAgency(agency);
  const reason = !enterable
    ? agency.status !== 'ACTIVE'
      ? t('agency.reasonSuspended')
      : t('agency.reasonMembershipSuspended')
    : null;

  return (
    <Card
      withBorder
      radius="md"
      component="button"
      type="button"
      disabled={!enterable}
      onClick={() => onSelect(agency.code)}
      style={{ textAlign: 'start', cursor: enterable ? 'pointer' : 'not-allowed' }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={0}>
          <Group gap="xs">
            <IconBuildingSkyscraper size={18} />
            <Text fw={600}>{agency.name}</Text>
            <StatusBadge status={agency.status} />
          </Group>
          <Text size="xs" c="dimmed" ff="monospace">
            {agency.code}
          </Text>
          {reason ? (
            <Text size="xs" c="red">
              {reason}
            </Text>
          ) : null}
        </Stack>
        <StatusBadge status={agency.membershipStatus} />
      </Group>
    </Card>
  );
}
