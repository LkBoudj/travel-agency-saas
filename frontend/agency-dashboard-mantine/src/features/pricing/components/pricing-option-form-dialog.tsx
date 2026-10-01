import { useTranslation } from 'react-i18next';
import { Grid, Select, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { FormActions } from '../../../components/form/form-actions.tsx';
import { FormErrorSummary } from '../../../components/form/form-error-summary.tsx';
import { ModalFormShell } from '../../../components/form/modal-form-shell.tsx';
import {
  pricingOptionFormInitialValues,
  usePricingOptionForm,
} from '../hooks/use-pricing-option-form.ts';
import type { PricingOptionFormValues } from '../schemas/pricing-option.schema.ts';
import type { PricingOption } from '../types.ts';

export interface PricingOptionFormDialogProps {
  /** `null` opens the create form; an option opens the edit form for it. */
  option: PricingOption | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: PricingOptionFormValues) => void;
}

/**
 * Create/Edit one pricing option. Create captures an optional currency
 * (blank → backend defaults to DZD); edit hides currency because it is
 * immutable after creation. Status is never editable here — an option is
 * born ACTIVE and only deactivation moves it to INACTIVE.
 */
export function PricingOptionFormDialog({
  option,
  submitting,
  onClose,
  onSubmit,
}: PricingOptionFormDialogProps) {
  const { t } = useTranslation('pricing');
  const isEditing = option !== null;
  const form = usePricingOptionForm(pricingOptionFormInitialValues(option));
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

          <TextInput
            label={t('fields.nameLabel')}
            placeholder={t('fields.namePlaceholder')}
            description={t('fields.nameHelper')}
            withAsterisk
            {...form.getInputProps('name')}
          />

          <Select
            label={t('fields.basisLabel')}
            data={[
              { value: 'per_person', label: t('basis.per_person') },
              { value: 'per_booking', label: t('basis.per_booking') },
            ]}
            allowDeselect={false}
            {...form.getInputProps('basis')}
          />

          {!isEditing ? (
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <TextInput
                  label={t('fields.currencyLabel')}
                  placeholder={t('fields.currencyPlaceholder')}
                  description={t('createDialog.currencyHelper')}
                  maxLength={3}
                  autoCapitalize="characters"
                  {...form.getInputProps('currency')}
                />
              </Grid.Col>
            </Grid>
          ) : (
            <TextInput
              label={t('fields.currencyLabel')}
              value={option.currency}
              readOnly
              description={t('createDialog.currencyHelper')}
            />
          )}

          <Textarea
            label={t('fields.descriptionLabel')}
            placeholder={t('fields.descriptionPlaceholder')}
            autosize
            minRows={2}
            {...form.getInputProps('description')}
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
