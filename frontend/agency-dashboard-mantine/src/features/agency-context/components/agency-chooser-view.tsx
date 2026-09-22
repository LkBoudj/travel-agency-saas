import { IconLogout } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Stack, Text, Title } from '@mantine/core';
import { EmptyState } from '../../../components/empty-state.tsx';
import { FullPageLoader } from '../../../components/full-page-loader.tsx';
import type { MyAgency } from '../types.ts';
import { AgencyCard } from './agency-card.tsx';

interface AgencyChooserViewProps {
  agencies: MyAgency[];
  autoEntered: boolean;
  onSelect: (agencyCode: string) => void;
  onSignOut: () => void;
}

export function AgencyChooserView({
  agencies,
  autoEntered,
  onSelect,
  onSignOut,
}: AgencyChooserViewProps) {
  const { t } = useTranslation('common');

  if (autoEntered) {
    return <FullPageLoader label={t('agency.entering')} />;
  }

  return (
    <Stack maw={560} mx="auto" p="xl" gap="lg">
      <Stack gap={2}>
        <Title order={2}>{t('agency.chooseTitle')}</Title>
        <Text c="dimmed" size="sm">
          {t('agency.chooseSubtitle')}
        </Text>
      </Stack>

      {agencies.length === 0 ? (
        <EmptyState title={t('agency.noAgencies')} description={t('agency.noAgenciesBody')} />
      ) : (
        <Stack gap="sm">
          {agencies.map((agency) => (
            <AgencyCard key={agency.code} agency={agency} onSelect={onSelect} />
          ))}
        </Stack>
      )}

      <Button
        variant="subtle"
        color="gray"
        leftSection={<IconLogout size={16} />}
        onClick={onSignOut}
        style={{ alignSelf: 'flex-start' }}
      >
        {t('auth.signOut')}
      </Button>
    </Stack>
  );
}
