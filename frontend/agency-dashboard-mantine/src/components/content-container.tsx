import type { ReactNode } from 'react';
import { Box, type BoxProps } from '@mantine/core';

/**
 * The one place a page decides how far its content sits from the viewport edge.
 *
 * `AppShell` renders with `padding="0"` now, so padding lives with the page
 * content instead of being applied twice — once by the shell and once by the
 * page. `maxW` keeps a wide table from stretching across a 27" monitor while
 * leaving narrow pages free to run the full width.
 */
export function ContentContainer({ children, ...props }: { children: ReactNode } & BoxProps) {
  return (
    <Box
      w="100%"
      maw="90rem"
      mx="auto"
      px={{ base: 'md', sm: 'lg' }}
      py={{ base: 'md', sm: 'lg' }}
      {...props}
    >
      {children}
    </Box>
  );
}
