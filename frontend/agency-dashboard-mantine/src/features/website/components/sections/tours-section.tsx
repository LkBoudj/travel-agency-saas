import { useTranslation } from 'react-i18next';
import { Loader, MultiSelect, Stack, Text } from '@mantine/core';
import type { WebsiteForm } from '../../hooks/use-website-form.ts';
import type { TourCatalogItem } from '../../types.ts';

export interface ToursSectionProps {
  form: WebsiteForm;
  catalog: TourCatalogItem[];
  catalogPending: boolean;
}

export function ToursSection({ form, catalog, catalogPending }: ToursSectionProps) {
  const { t } = useTranslation('website');

  return (
    <Stack gap="md">
      {catalogPending ? (
        <Loader size="sm" />
      ) : catalog.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('empty.tourCatalog')}
        </Text>
      ) : (
        <MultiSelect
          label={t('fields.featuredTours')}
          description={t('sectionHints.tours')}
          data={catalog.map((tour) => ({ value: tour.code, label: tour.name }))}
          searchable
          clearable
          {...form.getInputProps('featuredTourCodes')}
        />
      )}
    </Stack>
  );
}
