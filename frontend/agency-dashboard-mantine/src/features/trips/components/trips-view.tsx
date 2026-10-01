import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Select, Stack, Text } from '@mantine/core';
import { ContentContainer } from '../../../components/content-container.tsx';
import { DataToolbar } from '../../../components/data-toolbar.tsx';
import { PageHeader } from '../../../components/page-header.tsx';
import { SearchInput } from '../../../components/search-input.tsx';
import { SectionHeader } from '../../../components/section-header.tsx';
import type { TripsPageController } from '../hooks/use-trips-page.ts';
import type { TourStatus } from '../types.ts';
import { ToursTable } from './tours-table.tsx';

const STATUS_OPTIONS: readonly { value: TourStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'statusFilter.all' },
  { value: 'DRAFT', label: 'statusFilter.draft' },
  { value: 'PUBLISHED', label: 'statusFilter.published' },
  { value: 'ARCHIVED', label: 'statusFilter.archived' },
];

export function TripsView(controller: TripsPageController) {
  const { t } = useTranslation('trips');
  const { t: tCommon } = useTranslation('common');

  return (
    <ContentContainer>
      <Stack gap="lg">
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
          actions={
            controller.canCreate ? (
              <Button leftSection={<IconPlus size={16} />} onClick={controller.openCreateDialog}>
                {t('create')}
              </Button>
            ) : null
          }
        />

        <DataToolbar
          search={
            <SearchInput
              value={controller.search.raw}
              onChange={controller.search.setRaw}
              placeholder={t('searchPlaceholder')}
            />
          }
          filters={
            <Select
              value={controller.status}
              onChange={(value) => controller.setStatus((value ?? 'all') as TourStatus | 'all')}
              data={STATUS_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.label),
              }))}
              w={180}
              aria-label={t('statusFilterLabel')}
              allowDeselect={false}
            />
          }
          actions={
            // The count is derived from the rows already in hand, so it never
            // disagrees with the table below it.
            <Text size="sm" c="dimmed" aria-live="polite">
              {tCommon('list.results', { count: controller.tours.length })}
            </Text>
          }
        />

        <Stack gap="md">
          <SectionHeader title={t('tableCaption')} />
          <ToursTable
            tours={controller.tours}
            canUpdate={controller.canUpdate}
            canPublish={controller.canPublish}
            canArchive={controller.canArchive}
            loading={controller.isPending}
            isError={controller.isError}
            onRetry={controller.refetch}
            onEdit={controller.openEditDialog}
            onPublish={controller.publishTour}
            onUnpublish={controller.unpublishTour}
            onArchive={controller.archiveTour}
            emptyAction={
              controller.canCreate ? (
                <Button leftSection={<IconPlus size={16} />} onClick={controller.openCreateDialog}>
                  {t('create')}
                </Button>
              ) : undefined
            }
          />
        </Stack>
      </Stack>
    </ContentContainer>
  );
}
