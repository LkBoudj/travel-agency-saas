import { useTranslation } from 'react-i18next';
import { Center, Loader, Stack, Text } from '@mantine/core';

export function FullPageLoader({ label }: { label?: string }) {
  const { t } = useTranslation('common');
  return (
    <Center mih="60dvh">
      <Stack align="center" gap="sm">
        <Loader />
        {label ? (
          <Text c="dimmed" size="sm">
            {label}
          </Text>
        ) : null}
        {label ? null : (
          <Text c="dimmed" size="sm">
            {t('shell.loading')}
          </Text>
        )}
      </Stack>
    </Center>
  );
}
