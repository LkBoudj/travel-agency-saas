import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Select, Stack, Text } from '@mantine/core';
import { ContentContainer } from '../../../components/content-container.tsx';
import { DataToolbar } from '../../../components/data-toolbar.tsx';
import { PageHeader } from '../../../components/page-header.tsx';
import { Panel } from '../../../components/panel.tsx';
import { SearchInput } from '../../../components/search-input.tsx';
import { SectionHeader } from '../../../components/section-header.tsx';
import type { BookingsPageController } from '../hooks/use-bookings-page.ts';
import type { BookingStatus } from '../types.ts';
import { BookingsTable } from './bookings-table.tsx';

const STATUS_OPTIONS: readonly { value: BookingStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'statusFilter.all' },
  { value: 'PENDING', label: 'statusFilter.pending' },
  { value: 'CONFIRMED', label: 'statusFilter.confirmed' },
  { value: 'CANCELLED', label: 'statusFilter.cancelled' },
];

export function BookingsView(controller: BookingsPageController) {
  const { t } = useTranslation('bookings');
  const { t: tCommon } = useTranslation('common');

  return (
    <ContentContainer>
      <Stack gap="lg">
        <PageHeader
          title={t('page.title')}
          subtitle={t('page.subtitle')}
          actions={
            controller.canCreate ? (
              <Button
                color="blue"
                leftSection={<IconPlus size={16} />}
                onClick={controller.openCreate}
                styles={{
                  root: {
                    backgroundColor: '#1971c2',
                    fontWeight: 600,
                  },
                }}
              >
                {t('page.create')}
              </Button>
            ) : null
          }
        />

        <DataToolbar
          search={
            <SearchInput
              value={controller.search.raw}
              onChange={controller.search.setRaw}
              placeholder={t('page.searchPlaceholder')}
            />
          }
          filters={
            <Select
              value={controller.status}
              onChange={(value) => controller.setStatus((value ?? 'all') as BookingStatus | 'all')}
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
            <Text size="sm" c="dimmed" aria-live="polite">
              {tCommon('list.results', { count: controller.bookings.length })}
            </Text>
          }
        />

        <Stack gap="md">
          <SectionHeader title={t('columns.tableCaption')} />
          <Panel p={0} style={{ overflow: 'hidden' }}>
            <BookingsTable
              bookings={controller.bookings}
              loading={controller.isPending}
              isError={controller.isError}
              onRetry={controller.refetch}
              onViewDetails={controller.openDetails}
              emptyAction={
                controller.canCreate ? (
                  <Button
                    color="blue"
                    leftSection={<IconPlus size={16} />}
                    onClick={controller.openCreate}
                    styles={{ root: { backgroundColor: '#1971c2', fontWeight: 600 } }}
                  >
                    {t('page.create')}
                  </Button>
                ) : undefined
              }
            />
          </Panel>
        </Stack>
      </Stack>
    </ContentContainer>
  );
}
