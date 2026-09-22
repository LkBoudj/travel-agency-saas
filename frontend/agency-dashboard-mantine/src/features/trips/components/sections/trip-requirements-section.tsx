import { useTranslation } from 'react-i18next';
import { Grid, Select, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { TripFormValues } from '../../schemas/tour.schema.ts';
import { buildCatalogOptions } from './catalog-options.ts';

export interface TripRequirementsSectionProps {
  form: UseFormReturnType<TripFormValues>;
}

export function TripRequirementsSection({ form }: TripRequirementsSectionProps) {
  const { t } = useTranslation('trips');
  const options = buildCatalogOptions(t);

  return (
    <Grid>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <Select
          label={t('editor.fields.difficulty')}
          data={[{ value: '', label: t('editor.emptySelect') }, ...options.difficulties]}
          allowDeselect
          {...form.getInputProps('activityRequirements.difficulty')}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <Select
          label={t('editor.fields.fitnessLevel')}
          data={[{ value: '', label: t('editor.emptySelect') }, ...options.fitness]}
          allowDeselect
          {...form.getInputProps('activityRequirements.fitnessLevel')}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <TextInput
          label={t('editor.fields.minimumAge')}
          inputMode="numeric"
          {...form.getInputProps('activityRequirements.minimumAge')}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <TextInput
          label={t('editor.fields.distanceKm')}
          inputMode="numeric"
          {...form.getInputProps('activityRequirements.distanceKm')}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <TextInput
          label={t('editor.fields.elevationGainM')}
          inputMode="numeric"
          {...form.getInputProps('activityRequirements.elevationGainM')}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <TextInput
          label={t('editor.fields.requiredEquipment')}
          {...form.getInputProps('activityRequirements.requiredEquipment')}
        />
      </Grid.Col>
    </Grid>
  );
}
