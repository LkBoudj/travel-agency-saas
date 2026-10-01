import type { ReactNode } from 'react';
import { IconAlertCircle } from '@tabler/icons-react';
import { Group, Text } from '@mantine/core';

/** Inline error for custom fields that don't render `error` themselves (e.g. checkbox groups). */
export function FieldError({ message }: { message?: ReactNode }) {
  if (!message) {
    return null;
  }
  return (
    // Not a live region on purpose: `FormErrorSummary` is the single announcement
    // for a rejected submit, and a per-field `role="alert"` would interrupt once
    // per error on top of it. The message never relies on colour alone — it has an
    // icon and text — and it stays in the accessibility tree beside its field.
    <Group gap={4} align="center">
      <IconAlertCircle size={14} color="var(--app-icon-danger)" />
      <Text size="xs" c="danger">
        {message}
      </Text>
    </Group>
  );
}
