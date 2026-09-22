import type { ReactNode } from 'react';
import { Box, Center } from '@mantine/core';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box
      style={{ minHeight: '100dvh', backgroundColor: 'var(--mantine-color-gray-0)' }}
      data-color-scheme="light"
    >
      <Center mih="100dvh" p="md">
        {children}
      </Center>
    </Box>
  );
}
