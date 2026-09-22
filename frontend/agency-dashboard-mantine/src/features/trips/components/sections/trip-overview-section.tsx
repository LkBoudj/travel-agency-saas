import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox, Grid, Select, Stack, Text, TextInput, Textarea } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { TripFormValues } from '../../schemas/tour.schema.ts';
import type { TourFormat } from '../../types.ts';
import { buildCatalogOptions } from './catalog-options.ts';

export interface TripOverviewSectionProps {
  form: UseFormReturnType<TripFormValues>;
  /** Editor-level flag: false until the user edits nights manually, so days can autosuggest them. */
  nightsTouchedRef?: RefObject<boolean>;
}

const MULTI_DAY_FORMATS: readonly TourFormat[] = ['stay', 'circuit', 'cruise'];

function suggestedNights(days: string): string {
  const parsed = Number.parseInt(days, 10);
  return Number.isInteger(parsed) ? String(Math.max(0, parsed - 1)) : '';
}

export function TripOverviewSection({ form, nightsTouchedRef }: TripOverviewSectionProps) {
  const { t } = useTranslation('trips');
  const options = buildCatalogOptions(t);
  const format = form.values.format;
  const showDays = MULTI_DAY_FORMATS.includes(format);
  const showHours = format === 'experience';
  const fixedSingleDay = format === 'day_excursion';

  const handleDaysChange = (value: string) => {
    form.setFieldValue('days', value);
    if (!nightsTouchedRef?.current) {
      form.setFieldValue('nights', suggestedNights(value));
    }
  };

  return (
    <Stack gap="sm">
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <TextInput
            label={t('editor.fields.name')}
            placeholder={t('editor.placeholders.name')}
            {...form.getInputProps('name')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <TextInput
            label={t('editor.fields.internalRef')}
            placeholder={t('editor.placeholders.internalRef')}
            {...form.getInputProps('internalRef')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label={t('editor.fields.format')}
            data={options.formats}
            {...form.getInputProps('format')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label={t('editor.fields.geographicScope')}
            data={options.scopes}
            {...form.getInputProps('geographicScope')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label={t('editor.fields.availabilityMode')}
            data={options.modes}
            {...form.getInputProps('availabilityMode')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label={t('editor.fields.participationMode')}
            data={[{ value: '', label: t('editor.emptySelect') }, ...options.participations]}
            allowDeselect
            {...form.getInputProps('participationMode')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Select
            label={t('editor.fields.guidanceType')}
            data={[{ value: '', label: t('editor.emptySelect') }, ...options.guidance]}
            allowDeselect
            {...form.getInputProps('guidanceType')}
          />
        </Grid.Col>
      </Grid>

      <Stack gap={4}>
        <Text fw={600} size="sm">
          {t('editor.sections.overviewDuration')}
        </Text>
        {showDays ? (
          <Grid>
            <Grid.Col span={4}>
              <TextInput
                label={t('editor.fields.days')}
                inputMode="numeric"
                onChange={(event) => handleDaysChange(event.currentTarget.value)}
                value={form.values.days}
              />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput
                label={t('editor.fields.nights')}
                inputMode="numeric"
                onChange={(event) => {
                  if (nightsTouchedRef) {
                    nightsTouchedRef.current = true;
                  }
                  form.setFieldValue('nights', event.currentTarget.value);
                }}
                value={form.values.nights}
              />
            </Grid.Col>
            <Grid.Col span={4} />
          </Grid>
        ) : null}
        {showHours ? (
          <TextInput
            label={t('editor.fields.hours')}
            inputMode="numeric"
            {...form.getInputProps('hours')}
          />
        ) : null}
        {fixedSingleDay ? (
          <Text size="sm" c="dimmed">
            {t('editor.sections.singleDayHint')}
          </Text>
        ) : null}
      </Stack>

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <TextInput
            label={t('editor.fields.minTravelers')}
            inputMode="numeric"
            {...form.getInputProps('minTravelers')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Checkbox
            label={t('editor.fields.isFlexible')}
            {...form.getInputProps('isFlexible', { type: 'checkbox' })}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }} />
        <Grid.Col span={12}>
          <Textarea
            label={t('editor.fields.languages')}
            description={t('editor.lineListHint')}
            autosize
            minRows={2}
            {...form.getInputProps('languages')}
          />
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
