import { useTranslation } from 'react-i18next';
import { modals } from '@mantine/modals';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  color?: string;
  onConfirm: () => void;
}

export function openConfirmDialog(options: ConfirmDialogOptions): void {
  const { title, message, confirmLabel, cancelLabel, color, onConfirm } = options;
  const id = modals.openConfirmModal({
    title,
    children: message,
    color,
    labels: { confirm: confirmLabel ?? 'Confirm', cancel: cancelLabel ?? 'Cancel' },
    confirmProps: { color },
    onConfirm: () => {
      modals.close(id);
      onConfirm();
    },
  });
}

export function useConfirmDialog() {
  const { t } = useTranslation('common');
  return (options: Omit<ConfirmDialogOptions, 'confirmLabel' | 'cancelLabel'>) =>
    openConfirmDialog({
      confirmLabel: t('actions.confirm'),
      cancelLabel: t('actions.cancel'),
      ...options,
    });
}
