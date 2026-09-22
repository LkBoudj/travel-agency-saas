import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Group, Select, Stack } from '@mantine/core';
import { PageHeader } from '../../../components/page-header.tsx';
import { SearchInput } from '../../../components/search-input.tsx';
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

  return (
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

      <Card withBorder radius="md" p="xs">
        <Stack gap="sm">
          <Group justify="space-between" gap="sm" wrap="nowrap" align="center">
            <SearchInput
              value={controller.search.raw}
              onChange={controller.search.setRaw}
              placeholder={t('searchPlaceholder')}
            />
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
          </Group>
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
          />
        </Stack>
      </Card>
    </Stack>
  );
}
