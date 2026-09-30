import { IconCheck, IconCopy } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, CopyButton, Group, Text } from '@mantine/core';

export function EntityCode({ code }: { code: string }) {
  const { t } = useTranslation('common');
  return (
    <Group gap={4} wrap="nowrap">
      <Text ff="monospace" fz="xs" c="dimmed">
        {code}
      </Text>
      <CopyButton value={code} timeout={1200}>
        {({ copied, copy }) => (
          <ActionIcon
            variant="subtle"
            color={copied ? 'success' : undefined}
            onClick={copy}
            size="sm"
            aria-label={t('actions.copyCode')}
          >
            {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
          </ActionIcon>
        )}
      </CopyButton>
    </Group>
  );
}
