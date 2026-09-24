import type { FormEvent, ReactNode } from 'react';
import { FormActions } from '../form/form-actions.tsx';
import { ModalFormShell } from '../form/modal-form-shell.tsx';

/**
 * Presentational shell for an inline "create a new entity while picking"
 * flow. The caller plugs in the actual form fields (children) and the form's
 * `onSubmit`; the dialog only owns the chrome.
 */
export function QuickCreateDialog({
  opened,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel,
  submitting,
}: {
  opened: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  submitting?: boolean;
}) {
  return (
    <ModalFormShell opened={opened} onClose={onClose} title={title} size="sm">
      <form onSubmit={onSubmit} noValidate>
        {children}
        <FormActions submitLabel={submitLabel} onCancel={onClose} submitting={submitting} />
      </form>
    </ModalFormShell>
  );
}
