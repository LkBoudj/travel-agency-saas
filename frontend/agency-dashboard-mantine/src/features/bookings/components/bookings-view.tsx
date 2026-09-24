import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Group, Select, Stack } from '@mantine/core';
import { PageHeader } from '../../../components/page-header.tsx';
import { SearchInput } from '../../../components/search-input.tsx';
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

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('page.title')}
        subtitle={t('page.subtitle')}
        actions={
          controller.canCreate ? (
            <Button leftSection={<IconPlus size={16} />} onClick={controller.openCreate}>
              {t('page.create')}
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
              placeholder={t('page.searchPlaceholder')}
            />
            <Select
              value={controller.status}
              onChange={(value) => controller.setStatus((value ?? 'all') as BookingStatus | 'all')}
              data={STATUS_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.label),
              }))}
              w={180}
              aria-label={t('statusFilter.all')}
              allowDeselect={false}
            />
          </Group>
          <BookingsTable
            bookings={controller.bookings}
            loading={controller.isPending}
            isError={controller.isError}
            onRetry={controller.refetch}
            onViewDetails={controller.openDetails}
          />
        </Stack>
      </Card>
    </Stack>
  );
}
