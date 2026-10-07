import type { ReactNode } from 'react';
import { Modal } from '@mantine/core';

export interface ModalFormShellProps {
  opened: boolean;
  onClose: () => void;
  title: ReactNode;
  size?: string | number;
  children: ReactNode;
}

export function ModalFormShell({
  opened,
  onClose,
  title,
  size = 'md',
  children,
}: ModalFormShellProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      size={size}
      centered
      removeScrollProps={{ removeScrollBar: false }}
    >
      {children}
    </Modal>
  );
}
