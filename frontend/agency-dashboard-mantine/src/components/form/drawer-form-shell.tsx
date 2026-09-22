import type { ReactNode } from 'react';
import { Drawer } from '@mantine/core';

export interface DrawerFormShellProps {
  opened: boolean;
  onClose: () => void;
  title: ReactNode;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: string | number;
  children: ReactNode;
}

export function DrawerFormShell({
  opened,
  onClose,
  title,
  position = 'right',
  size = 'lg',
  children,
}: DrawerFormShellProps) {
  return (
    <Drawer opened={opened} onClose={onClose} title={title} position={position} size={size}>
      {children}
    </Drawer>
  );
}
