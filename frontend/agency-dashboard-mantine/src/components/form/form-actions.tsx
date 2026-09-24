import { useTranslation } from 'react-i18next';
import { Button, Group } from '@mantine/core';

export interface FormActionsProps {
  submitLabel: string;
  cancelLabel?: string;
  onCancel?: () => void;
  submitting?: boolean;
  disabled?: boolean;
}

export function FormActions({
  submitLabel,
  cancelLabel,
  onCancel,
  submitting,
  disabled,
}: FormActionsProps) {
  const { t } = useTranslation('common');

  return (
    <Group justify="flex-end" gap="sm" mt="lg">
      {onCancel ? (
        <Button variant="default" onClick={onCancel} disabled={submitting}>
          {cancelLabel ?? t('actions.cancel')}
        </Button>
      ) : null}
      <Button type="submit" loading={submitting} disabled={disabled}>
        {submitLabel}
      </Button>
    </Group>
  );
}
