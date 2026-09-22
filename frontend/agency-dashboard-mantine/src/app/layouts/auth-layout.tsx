import type { ReactNode } from 'react';
import { Box, Center } from '@mantine/core';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box style={{ minHeight: '100dvh' }}>
      <Center mih="100dvh" p="md">
        {children}
      </Center>
    </Box>
  );
}
