import type { ReactNode } from 'react';
import { IconInbox, IconAlertTriangle, IconRefresh } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Stack, Text, Title } from '@mantine/core';

export function EmptyState({
  title,
  description,
  action,
  compact = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Tighter vertical rhythm for an empty state inside a section band. */
  compact?: boolean;
}) {
  const { t } = useTranslation('common');

  return (
    <Box py={compact ? 'md' : 'xl'}>
      <Stack align="center" gap={4} c="dimmed">
        <IconInbox size={compact ? 22 : 32} stroke={1.5} />
        <Text size="sm" fw={600}>
          {title ?? t('emptyDefault')}
        </Text>
        {description ? <Text size="sm">{description}</Text> : null}
        {action ? <Box mt="sm">{action}</Box> : null}
      </Stack>
    </Box>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
}) {
  const { t } = useTranslation('common');

  return (
    // `role="alert"` so the failure is announced when it appears after a fetch
    // settles; a coloured border alone is not perceivable to a screen reader.
    <Box py="xl" role="alert">
      <Stack align="center" gap={4}>
        <IconAlertTriangle size={32} stroke={1.5} color="var(--app-icon-danger)" />
        <Title order={5} tt="none">
          {title ?? t('errorTitle')}
        </Title>
        {description ? (
          <Text size="sm" c="dimmed" ta="center">
            {description}
          </Text>
        ) : null}
        {onRetry ? (
          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={onRetry} mt="sm">
            {t('actions.retry')}
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
}
