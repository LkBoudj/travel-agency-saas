import { useTranslation } from 'react-i18next';
import { Avatar, Stack, TextInput, Textarea } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { TripFormValues } from '../../schemas/tour.schema.ts';

export interface TripContentSectionProps {
  form: UseFormReturnType<TripFormValues>;
}

export function TripContentSection({ form }: TripContentSectionProps) {
  const { t } = useTranslation('trips');

  return (
    <Stack gap="sm">
      <TextInput
        label={t('editor.fields.coverImageUrl')}
        placeholder={t('editor.placeholders.coverImageUrl')}
        {...form.getInputProps('coverImageUrl')}
      />
      {form.values.coverImageUrl.trim().length > 0 ? (
        <Avatar
          src={form.values.coverImageUrl.trim()}
          size="xl"
          radius="md"
          imageProps={{ referrerPolicy: 'no-referrer' }}
        />
      ) : null}
      <Textarea
        label={t('editor.fields.shortDescription')}
        autosize
        minRows={2}
        maxRows={4}
        {...form.getInputProps('shortDescription')}
      />
      <Textarea
        label={t('editor.fields.description')}
        autosize
        minRows={4}
        maxRows={12}
        {...form.getInputProps('description')}
      />
      <Textarea
        label={t('editor.fields.gallery')}
        description={t('editor.lineListHint')}
        autosize
        minRows={2}
        {...form.getInputProps('gallery')}
      />
    </Stack>
  );
}
