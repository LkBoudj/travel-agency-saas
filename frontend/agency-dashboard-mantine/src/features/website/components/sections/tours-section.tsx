import { useTranslation } from 'react-i18next';
import { Loader, MultiSelect, Stack } from '@mantine/core';
import { EmptyState } from '../../../../components/empty-state.tsx';
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
        <EmptyState
          compact
          title={t('empty.noFeaturedToursTitle')}
          description={t('empty.tourCatalog')}
        />
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
