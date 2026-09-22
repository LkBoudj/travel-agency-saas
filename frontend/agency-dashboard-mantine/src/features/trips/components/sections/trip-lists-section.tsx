import { useTranslation } from 'react-i18next';
import { Stack, Textarea } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { TripFormValues } from '../../schemas/tour.schema.ts';

export interface TripListsSectionProps {
  form: UseFormReturnType<TripFormValues>;
}

export function TripListsSection({ form }: TripListsSectionProps) {
  const { t } = useTranslation('trips');

  return (
    <Stack gap="sm">
      <Textarea
        label={t('editor.fields.highlights')}
        description={t('editor.lineListHint')}
        autosize
        minRows={3}
        {...form.getInputProps('highlights')}
      />
      <Textarea
        label={t('editor.fields.included')}
        description={t('editor.lineListHint')}
        autosize
        minRows={2}
        {...form.getInputProps('included')}
      />
      <Textarea
        label={t('editor.fields.notIncluded')}
        description={t('editor.lineListHint')}
        autosize
        minRows={2}
        {...form.getInputProps('notIncluded')}
      />
    </Stack>
  );
}
