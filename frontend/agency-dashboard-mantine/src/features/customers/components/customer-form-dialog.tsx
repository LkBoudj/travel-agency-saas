import { useTranslation } from 'react-i18next';
import { Grid, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { FormActions } from '../../../components/form/form-actions.tsx';
import { FormErrorSummary } from '../../../components/form/form-error-summary.tsx';
import { ModalFormShell } from '../../../components/form/modal-form-shell.tsx';
import { customerFormInitialValues, useCustomerForm } from '../hooks/use-customer-form.ts';
import type { CustomerFormValues } from '../schemas/customer.schema.ts';
import type { Customer } from '../types.ts';

export interface CustomerFormDialogProps {
  customer: Customer | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: CustomerFormValues) => void;
}

export function CustomerFormDialog({
  customer,
  submitting,
  onClose,
  onSubmit,
}: CustomerFormDialogProps) {
  const { t } = useTranslation('customers');
  const isEditing = customer !== null;
  const form = useCustomerForm(customerFormInitialValues(customer));
  const handleSubmit = form.onSubmit(onSubmit);

  return (
    <ModalFormShell
      opened
      onClose={onClose}
      title={t(isEditing ? 'editDialog.title' : 'createDialog.title')}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          <FormErrorSummary errors={form.errors} />
          <Text size="sm" c="dimmed">
            {t(isEditing ? 'editDialog.description' : 'createDialog.description')}
          </Text>

          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput
                label={t('fields.firstName')}
                autoFocus
                {...form.getInputProps('firstName')}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TextInput label={t('fields.lastName')} {...form.getInputProps('lastName')} />
            </Grid.Col>
          </Grid>

          <TextInput
            label={t('fields.email')}
            placeholder={t('fields.emailPlaceholder')}
            {...form.getInputProps('email')}
          />
          <TextInput label={t('fields.phone')} {...form.getInputProps('phone')} />
          <Textarea
            label={t('fields.notes')}
            autosize
            minRows={3}
            {...form.getInputProps('notes')}
          />
        </Stack>

        <FormActions
          submitLabel={t(isEditing ? 'editDialog.submit' : 'createDialog.submit')}
          onCancel={onClose}
          submitting={submitting}
        />
      </form>
    </ModalFormShell>
  );
}
