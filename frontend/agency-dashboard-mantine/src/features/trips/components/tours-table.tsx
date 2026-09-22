import dayjs from 'dayjs';
import {
  IconArchive,
  IconDots,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Avatar, Group, Menu, Stack, Text } from '@mantine/core';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { ErrorState } from '../../../components/empty-state.tsx';
import { MoneyText } from '../../../components/money-text.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { tourDestinationsSummary, tourLabel } from '../lib/tour-display.ts';
import type { TourListRow } from '../types.ts';

export interface ToursTableProps {
  tours: TourListRow[];
  canUpdate: boolean;
  canPublish: boolean;
  canArchive: boolean;
  loading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEdit: (tour: TourListRow) => void;
  onPublish: (tour: TourListRow) => void;
  onUnpublish: (tour: TourListRow) => void;
  onArchive: (tour: TourListRow) => void;
}

export function ToursTable({
  tours,
  canUpdate,
  canPublish,
  canArchive,
  loading,
  isError,
  onRetry,
  onEdit,
  onPublish,
  onUnpublish,
  onArchive,
}: ToursTableProps) {
  const { t } = useTranslation('trips');

  const columns: DataTableColumn<TourListRow>[] = [
    {
      key: 'tour',
      header: t('columns.tour'),
      w: '34%',
      render: (tour) => (
        <Group gap="sm" wrap="nowrap">
          <Avatar
            src={tour.coverImageUrl ?? undefined}
            color="violet"
            radius="md"
            size="md"
            imageProps={{ referrerPolicy: 'no-referrer' }}
          >
            {tourLabel(tour).charAt(0).toUpperCase()}
          </Avatar>
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text fw={500} truncate>
              {tourLabel(tour)}
            </Text>
            <Text size="xs" c="dimmed" truncate>
              {tour.code}
            </Text>
          </Stack>
        </Group>
      ),
    },
    {
      key: 'destinations',
      header: t('columns.destinations'),
      render: (tour) => {
        const summary = tourDestinationsSummary(tour);
        return (
          <Text size="sm" truncate c={summary ? undefined : 'dimmed'}>
            {summary || '—'}
          </Text>
        );
      },
    },
    {
      key: 'schedule',
      header: t('columns.schedule'),
      render: (tour) => {
        const days = tour.days ?? tour.hours;
        return (
          <Text size="sm" c="dimmed">
            {days == null ? '—' : `${days}d`}
          </Text>
        );
      },
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (tour) => <StatusBadge status={tour.status} />,
    },
    {
      key: 'price',
      header: t('columns.price'),
      render: (tour) =>
        tour.startingPrice == null ? (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ) : (
          <MoneyText amount={tour.startingPrice} />
        ),
    },
    {
      key: 'created',
      header: t('columns.created'),
      render: (tour) => (
        <Text size="sm" c="dimmed">
          {dayjs(tour.createdAt).format('ll')}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: '',
      w: 48,
      render: (tour) => {
        if (!canUpdate && !canPublish && !canArchive) {
          return null;
        }

        return (
          <Menu withinPortal position="bottom-end" shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={t('menu')}>
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {canUpdate ? (
                <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onEdit(tour)}>
                  {t('edit')}
                </Menu.Item>
              ) : null}
              {canPublish && tour.status === 'DRAFT' ? (
                <Menu.Item
                  leftSection={<IconPlayerPlay size={16} />}
                  onClick={() => onPublish(tour)}
                >
                  {t('publish')}
                </Menu.Item>
              ) : null}
              {canPublish && tour.status === 'PUBLISHED' ? (
                <Menu.Item
                  leftSection={<IconPlayerPause size={16} />}
                  onClick={() => onUnpublish(tour)}
                >
                  {t('unpublish')}
                </Menu.Item>
              ) : null}
              {canArchive && tour.status !== 'ARCHIVED' ? (
                <Menu.Item
                  leftSection={<IconArchive size={16} />}
                  color="red"
                  onClick={() => onArchive(tour)}
                >
                  {t('archive')}
                </Menu.Item>
              ) : null}
            </Menu.Dropdown>
          </Menu>
        );
      },
    },
  ];

  if (isError) {
    return <ErrorState title={t('loadError')} onRetry={onRetry} />;
  }

  return (
    <DataTable
      rows={tours}
      columns={columns}
      keyOf={(tour) => tour.code}
      loading={loading}
      emptyState={t('tripsEmpty')}
    />
  );
}
