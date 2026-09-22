import { useTranslation } from 'react-i18next';
import { Grid, MultiSelect } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { TripFormValues } from '../../schemas/tour.schema.ts';
import { buildCatalogOptions } from './catalog-options.ts';

export interface TripCategoriesSectionProps {
  form: UseFormReturnType<TripFormValues>;
}

export function TripCategoriesSection({ form }: TripCategoriesSectionProps) {
  const { t } = useTranslation('trips');
  const options = buildCatalogOptions(t);

  return (
    <Grid>
      {(
        [
          ['themes', 'themes'],
          ['activities', 'activities'],
          ['audiences', 'audiences'],
          ['transportModes', 'transports'],
          ['accommodationTypes', 'accommodations'],
        ] as const
      ).map(([field, key]) => (
        <Grid.Col span={{ base: 12, md: 6 }} key={field}>
          <MultiSelect
            label={t(`editor.fields.${field}`)}
            data={options[key]}
            searchable
            hidePickedOptions
            {...form.getInputProps(field)}
          />
        </Grid.Col>
      ))}
    </Grid>
  );
}
