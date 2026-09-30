import type { ReactNode } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';
import { Group, Text } from '@mantine/core';

/** Inline error for custom fields that don't render `error` themselves (e.g. checkbox groups). */
export function FieldError({ message }: { message?: ReactNode }) {
  if (!message) {
    return null;
  }
  return (
    // Announced on appearance: the message is the only signal, so it must not rely
    // on colour. Paired with the form-level error summary, not a replacement for it.
    <Group gap={4} align="center" role="alert">
      <IconAlertCircle size={14} color="var(--mantine-color-danger-6)" />
      <Text size="xs" c="danger">
        {message}
      </Text>
    </Group>
  );
}
