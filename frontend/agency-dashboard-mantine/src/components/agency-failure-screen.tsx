import {
  IconLock,
  IconBuildingSkyscraper,
  IconShieldOff,
  IconRosetteDiscount,
  IconLogout,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Center, Stack, Text, Title } from '@mantine/core';
import type { AgencyAccessFailure } from '../features/agency-context/lib/agency-access.ts';

const CONFIG: Record<
  AgencyAccessFailure,
  { icon: typeof IconLock; titleKey: string; bodyKey: string }
> = {
  suspended: {
    icon: IconBuildingSkyscraper,
    titleKey: 'agency.failureSuspended',
    bodyKey: 'agency.failureSuspendedBody',
  },
  'not-member': {
    icon: IconShieldOff,
    titleKey: 'agency.failureNotMember',
    bodyKey: 'agency.failureNotMemberBody',
  },
  inactive: {
    icon: IconRosetteDiscount,
    titleKey: 'agency.failureInactive',
    bodyKey: 'agency.failureInactiveBody',
  },
  'permission-denied': {
    icon: IconLock,
    titleKey: 'agency.failurePermissionDenied',
    bodyKey: 'agency.failurePermissionDeniedBody',
  },
  'not-found': {
    icon: IconBuildingSkyscraper,
    titleKey: 'agency.failureNotFound',
    bodyKey: 'agency.failureNotFoundBody',
  },
  unexpected: {
    icon: IconLock,
    titleKey: 'agency.failureUnexpected',
    bodyKey: 'agency.failureUnexpectedBody',
  },
};

export function AgencyAccessFailureScreen({
  failure,
  onBack,
}: {
  failure: AgencyAccessFailure;
  onBack: () => void;
}) {
  const { t } = useTranslation('common');
  const { icon: Icon, titleKey, bodyKey } = CONFIG[failure];

  return (
    <Center mih="60dvh">
      <Stack align="center" gap={4} maw={440} ta="center">
        <Icon size={40} stroke={1.5} color="var(--app-icon-danger)" />
        <Title order={4}>{t(titleKey)}</Title>
        <Text c="dimmed" size="sm">
          {t(bodyKey)}
        </Text>
        <Button variant="light" leftSection={<IconLogout size={16} />} onClick={onBack} mt="sm">
          {t('agency.backToAgencies')}
        </Button>
      </Stack>
    </Center>
  );
}
