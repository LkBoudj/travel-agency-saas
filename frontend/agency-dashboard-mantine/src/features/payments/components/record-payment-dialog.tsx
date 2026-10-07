import { useTranslation } from 'react-i18next';
import { NumberInput, Select, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { FormActions } from '../../../components/form/form-actions.tsx';
import { FormErrorSummary } from '../../../components/form/form-error-summary.tsx';
import { ModalFormShell } from '../../../components/form/modal-form-shell.tsx';
import { useZodForm } from '../../../components/form/use-zod-form.ts';
import { useAppLocale } from '../../../i18n/hooks/use-app-locale.ts';
import { formatPaymentAmount } from '../lib/payment-payloads.ts';
import {
  recordPaymentFormSchema,
  type RecordPaymentFormValues,
} from '../schemas/payment.schema.ts';
import { PAYMENT_METHODS } from '../types.ts';

export interface RecordPaymentDialogProps {
  opened: boolean;
  bookingCode: string;
  currency: string;
  remainingAmount: number;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: RecordPaymentFormValues) => void;
}

export function RecordPaymentDialog({
  opened,
  bookingCode,
  currency,
  remainingAmount,
  submitting,
  onClose,
  onSubmit,
}: RecordPaymentDialogProps) {
  const { t } = useTranslation('payments');
  const locale = useAppLocale();

  const methodOptions = PAYMENT_METHODS.map((method) => ({
    value: method,
    label: t(`methods.${method}`, method),
  }));

  const form = useZodForm<RecordPaymentFormValues>({
    schema: recordPaymentFormSchema,
    initialValues: {
      amount: remainingAmount > 0 ? remainingAmount : '',
      method: null,
      reference: '',
      paidAt: new Date(),
      note: '',
    },
    fieldErrorKeys: {
      amount: { invalid: 'validation.amountInvalid' },
      reference: { invalid: 'validation.referenceMax' },
      note: { invalid: 'validation.noteMax' },
    },
    t,
  });

  const handleSubmit = form.onSubmit((values) => {
    onSubmit(values);
  });

  return (
    <ModalFormShell opened={opened} onClose={onClose} title={t('recordDialog.title')} size="md">
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <FormErrorSummary errors={form.errors} />

          <Text size="sm" c="dimmed">
            {t('recordDialog.description', { code: bookingCode })}
          </Text>

          {remainingAmount > 0 ? (
            <Text size="xs" c="dimmed">
              {t('summary.remainingAmount')}:{' '}
              <Text span fw={600} c="orange">
                {formatPaymentAmount(remainingAmount, currency, locale)}
              </Text>
            </Text>
          ) : null}

          <NumberInput
            label={t('recordDialog.amount')}
            required
            min={0.01}
            step={0.01}
            decimalScale={2}
            thousandSeparator=","
            prefix={currency ? `${currency} ` : undefined}
            autoFocus
            {...form.getInputProps('amount')}
          />

          <Select
            label={t('recordDialog.method')}
            placeholder={t('recordDialog.methodPlaceholder')}
            data={methodOptions}
            clearable
            {...form.getInputProps('method')}
          />

          <TextInput
            label={t('recordDialog.reference')}
            placeholder={t('recordDialog.referencePlaceholder')}
            {...form.getInputProps('reference')}
          />

          <DateTimePicker
            label={t('recordDialog.paidAt')}
            clearable={false}
            valueFormat="YYYY-MM-DD HH:mm"
            {...form.getInputProps('paidAt')}
          />

          <Textarea
            label={t('recordDialog.note')}
            placeholder={t('recordDialog.notePlaceholder')}
            autosize
            minRows={2}
            maxRows={4}
            {...form.getInputProps('note')}
          />
        </Stack>

        <FormActions
          submitLabel={t('recordDialog.submit')}
          onCancel={onClose}
          submitting={submitting}
        />
      </form>
    </ModalFormShell>
  );
}
