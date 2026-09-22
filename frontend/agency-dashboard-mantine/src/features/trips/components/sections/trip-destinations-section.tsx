import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Box, Button, Group, Grid, Stack, Text, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { FieldError } from '../../../../components/form/field-error.tsx';
import type { TripFormValues } from '../../schemas/tour.schema.ts';

export interface TripDestinationsSectionProps {
  form: UseFormReturnType<TripFormValues>;
}

export function TripDestinationsSection({ form }: TripDestinationsSectionProps) {
  const { t } = useTranslation('trips');

  return (
    <Stack gap="sm">
      <Text size="xs" c="dimmed">
        {t('editor.sections.originHint')}
      </Text>
      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <TextInput
            label={t('editor.fields.wilayaCode')}
            {...form.getInputProps('origin.wilayaCode')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <TextInput label={t('editor.fields.cityId')} {...form.getInputProps('origin.cityId')} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <TextInput label={t('editor.fields.place')} {...form.getInputProps('origin.place')} />
        </Grid.Col>
      </Grid>

      {form.values.destinations.map((_destination, index) => (
        <Group key={`dest-${index}`} gap="sm" align="flex-end" wrap="nowrap">
          <TextInput
            label={index === 0 ? t('editor.fields.wilayaCode') : undefined}
            aria-label={t('editor.fields.wilayaCode')}
            w="22%"
            {...form.getInputProps(`destinations.${index}.wilayaCode`)}
          />
          <TextInput
            label={index === 0 ? t('editor.fields.cityId') : undefined}
            aria-label={t('editor.fields.cityId')}
            w="28%"
            {...form.getInputProps(`destinations.${index}.cityId`)}
          />
          <TextInput
            label={index === 0 ? t('editor.fields.place') : undefined}
            aria-label={t('editor.fields.place')}
            w="40%"
            {...form.getInputProps(`destinations.${index}.place`)}
          />
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={t('editor.removeDestination')}
            disabled={form.values.destinations.length <= 1}
            onClick={() => form.removeListItem('destinations', index)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}
      <FieldError message={form.errors.destinations} />

      <Box>
        <Button
          variant="default"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            form.insertListItem('destinations', { wilayaCode: '', cityId: '', place: '' })
          }
        >
          {t('editor.addDestination')}
        </Button>
      </Box>
    </Stack>
  );
}
