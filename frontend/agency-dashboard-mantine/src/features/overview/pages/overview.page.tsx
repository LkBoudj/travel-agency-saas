import { useTranslation } from 'react-i18next';
import { Card, SimpleGrid, Stack, Text } from '@mantine/core';
import { PageHeader } from '../../../components/page-header.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';

export function OverviewPage() {
  const { t } = useTranslation('common');
  const { agency, membership, roles } = useAgencyContext();

  return (
    <Stack gap="lg">
      <PageHeader title={t('nav.overview')} subtitle={agency.name} />
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card withBorder radius="md">
          <Text size="xs" c="dimmed" tt="uppercase">
            {t('agency.status')}
          </Text>
          <StatusBadge status={agency.status} />
        </Card>
        <Card withBorder radius="md">
          <Text size="xs" c="dimmed" tt="uppercase">
            {t('overview.membership')}
          </Text>
          <Text fw={600}>{membership.membershipType}</Text>
        </Card>
        <Card withBorder radius="md">
          <Text size="xs" c="dimmed" tt="uppercase">
            {t('overview.roles')}
          </Text>
          <Text fw={600}>
            {roles.length === 0 ? '—' : roles.map((role) => role.name).join(', ')}
          </Text>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
