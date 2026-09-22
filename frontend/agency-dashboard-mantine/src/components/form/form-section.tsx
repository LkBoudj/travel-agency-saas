import type { ReactNode } from 'react';
import { Stack, Text } from '@mantine/core';

export interface FormSectionProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <Stack gap="sm">
      <Stack gap={2}>
        <Text fw={600} size="sm">
          {title}
        </Text>
        {description ? (
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        ) : null}
      </Stack>
      {children}
    </Stack>
  );
}
