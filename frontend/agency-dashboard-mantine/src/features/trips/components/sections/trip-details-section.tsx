import { useTranslation } from 'react-i18next';
import { Stack, Textarea, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { TripFormValues } from '../../schemas/tour.schema.ts';

export interface TripDetailsSectionProps {
  form: UseFormReturnType<TripFormValues>;
}

export function TripDetailsSection({ form }: TripDetailsSectionProps) {
  const { t } = useTranslation('trips');

  return (
    <Stack gap="sm">
      <Textarea
        label={t('editor.fields.importantInformation')}
        autosize
        minRows={2}
        {...form.getInputProps('importantInformation')}
      />
      <Textarea
        label={t('editor.fields.cancellationPolicy')}
        autosize
        minRows={2}
        {...form.getInputProps('cancellationPolicy')}
      />
      <TextInput label={t('editor.fields.meetingPoint')} {...form.getInputProps('meetingPoint')} />
      <Textarea
        label={t('editor.fields.meetingInstructions')}
        autosize
        minRows={2}
        {...form.getInputProps('meetingInstructions')}
      />
    </Stack>
  );
}
