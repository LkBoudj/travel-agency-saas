import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Box, Button, Group, Stack, Textarea, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { TripFormValues } from '../../schemas/tour.schema.ts';

export interface TripItinerarySectionProps {
  form: UseFormReturnType<TripFormValues>;
}

export function TripItinerarySection({ form }: TripItinerarySectionProps) {
  const { t } = useTranslation('trips');

  return (
    <Stack gap="sm">
      {form.values.itinerary.map((_row, index) => (
        <Group key={`itin-${index}`} gap="sm" align="flex-end" wrap="nowrap">
          <TextInput
            placeholder={t('editor.placeholders.itineraryTitle')}
            w="24%"
            {...form.getInputProps(`itinerary.${index}.title`)}
          />
          <TextInput
            placeholder={t('editor.placeholders.itineraryLocation')}
            w="20%"
            {...form.getInputProps(`itinerary.${index}.location`)}
          />
          <Textarea
            placeholder={t('editor.placeholders.itineraryDescription')}
            autosize
            style={{ flex: 1 }}
            {...form.getInputProps(`itinerary.${index}.description`)}
          />
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={t('editor.removeItineraryDay')}
            onClick={() => form.removeListItem('itinerary', index)}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}
      <Box>
        <Button
          variant="default"
          size="xs"
          leftSection={<IconPlus size={14} />}
          onClick={() =>
            form.insertListItem('itinerary', { title: '', location: '', description: '' })
          }
        >
          {t('editor.addItineraryDay')}
        </Button>
      </Box>
    </Stack>
  );
}
