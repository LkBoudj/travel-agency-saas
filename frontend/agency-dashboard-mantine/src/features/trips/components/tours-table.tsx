import type { ReactNode } from 'react';
import { IconArchive, IconPencil, IconPlayerPause, IconPlayerPlay } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Avatar, Group, Text } from '@mantine/core';
import { CellStack } from '../../../components/cell-stack.tsx';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { EmptyState, ErrorState } from '../../../components/empty-state.tsx';
import { MoneyText } from '../../../components/money-text.tsx';
import { RowActionsMenu } from '../../../components/row-actions-menu.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { useAppLocale } from '../../../i18n/hooks/use-app-locale.ts';
import { getIntlLocale } from '../../../i18n/locales.ts';
import { formatShortDate } from '../../../lib/format-date.ts';
import { tourDestinationsSummary, tourDurationParts, tourLabel } from '../lib/tour-display.ts';
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
  /** The next action for the empty listing; the page owns the handler. */
  emptyAction?: ReactNode;
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
  emptyAction,
}: ToursTableProps) {
  const { t } = useTranslation('trips');
  const intlLocale = getIntlLocale(useAppLocale());

  const columns: DataTableColumn<TourListRow>[] = [
    {
      key: 'tour',
      header: t('columns.tour'),
      // This table carries seven columns; below ~980px the cells start
      // truncating content the member needs, so it scrolls instead.
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
          <CellStack primary={tourLabel(tour)} secondary={tour.code} />
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
        const { kind, value } = tourDurationParts(tour);
        if (kind === 'none' || value == null) {
          return (
            <Text size="sm" c="dimmed">
              —
            </Text>
          );
        }
        return (
          <Text size="sm" c="dimmed">
            {t(`duration.${kind}`, { count: value })}
          </Text>
        );
      },
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (tour) => <StatusBadge status={tour.status} mode={tour.availabilityMode} />,
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
          {formatShortDate(tour.createdAt, intlLocale)}
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
          <RowActionsMenu
            actions={[
              ...(canUpdate
                ? [
                    {
                      key: 'edit',
                      label: t('edit'),
                      icon: <IconPencil size={16} />,
                      onClick: () => onEdit(tour),
                    },
                  ]
                : []),
              ...(canPublish && tour.status === 'DRAFT'
                ? [
                    {
                      key: 'publish',
                      label: t('publish'),
                      icon: <IconPlayerPlay size={16} />,
                      onClick: () => onPublish(tour),
                    },
                  ]
                : []),
              ...(canPublish && tour.status === 'PUBLISHED'
                ? [
                    {
                      key: 'unpublish',
                      label: t('unpublish'),
                      icon: <IconPlayerPause size={16} />,
                      onClick: () => onUnpublish(tour),
                    },
                  ]
                : []),
              ...(canArchive && tour.status !== 'ARCHIVED'
                ? [
                    {
                      key: 'archive',
                      label: t('archive'),
                      icon: <IconArchive size={16} />,
                      color: 'red',
                      onClick: () => onArchive(tour),
                    },
                  ]
                : []),
            ]}
          />
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
      caption={t('tableCaption')}
      minWidth={980}
      stickyHeader
      loading={loading}
      skeletonRows={5}
      rowLabel={(tour) => t('openTourRow', { name: tourLabel(tour) })}
      emptyState={
        // An empty listing states what to do next, not just that it is empty.
        <EmptyState
          title={t('tripsEmpty')}
          description={t('tripsEmptyBody')}
          action={emptyAction}
        />
      }
    />
  );
}
