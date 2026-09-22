import type { ReactNode } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';
import { Group, Text } from '@mantine/core';

/** Inline error for custom fields that don't render `error` themselves (e.g. checkbox groups). */
export function FieldError({ message }: { message?: ReactNode }) {
  if (!message) {
    return null;
  }
  return (
    <Group gap={4} align="center">
      <IconAlertCircle size={14} color="var(--mantine-color-red-6)" />
      <Text size="xs" c="red">
        {message}
      </Text>
    </Group>
  );
}
