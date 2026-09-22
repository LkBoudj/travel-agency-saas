import {
  IconArchive,
  IconPlayerPlay,
  IconPlayerStop,
  IconCircleCheck,
  IconCircleDashed,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Box, Button, Divider, Group, Stack, Text, Tooltip } from '@mantine/core';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { computeFormReadiness, readinessItemLabelKey } from '../lib/trip-readiness.ts';
import type { TripFormValues } from '../schemas/tour.schema.ts';
import type { Tour } from '../types.ts';

export interface TripReadinessPanelProps {
  tour: Tour;
  values: TripFormValues;
  canPublish: boolean;
  canArchive: boolean;
  isPublishing: boolean;
  isUnpublishing: boolean;
  isArchiving: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
}

export function TripReadinessPanel({
  tour,
  values,
  canPublish,
  canArchive,
  isPublishing,
  isUnpublishing,
  isArchiving,
  onPublish,
  onUnpublish,
  onArchive,
}: TripReadinessPanelProps) {
  const { t } = useTranslation('trips');
  const readiness = computeFormReadiness(values);
  const firstMissing = readiness.items.find((item) => !item.complete);

  const busy = isPublishing || isUnpublishing || isArchiving;
  const publishDisabled = tour.status !== 'DRAFT' || !readiness.publishable || !canPublish || busy;
  const publishTooltipLabel =
    canPublish && firstMissing ? t(readinessItemLabelKey(firstMissing.key)) : undefined;

  const publishButton = (
    <Button
      fullWidth
      leftSection={<IconPlayerPlay size={16} />}
      loading={isPublishing}
      disabled={publishDisabled}
      onClick={onPublish}
    >
      {t('publish')}
    </Button>
  );

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="nowrap">
        <Text fw={600} size="sm">
          {t('readiness.title')}
        </Text>
        <StatusBadge status={tour.status} />
      </Group>

      <Stack gap="xs">
        {readiness.items.map((item) => (
          <Group key={item.key} gap="xs" wrap="nowrap" align="flex-start">
            {item.complete ? (
              <IconCircleCheck size={18} color="var(--mantine-color-teal-6)" aria-hidden />
            ) : (
              <IconCircleDashed size={18} color="var(--mantine-color-gray-5)" aria-hidden />
            )}
            <Text size="sm" c={item.complete ? undefined : 'dimmed'}>
              {t(readinessItemLabelKey(item.key))}
            </Text>
          </Group>
        ))}
      </Stack>

      {values.availabilityMode === 'scheduled' ? (
        <Text size="xs" c="dimmed">
          {t('readiness.departureHint')}
        </Text>
      ) : null}

      <Divider />

      {!publishDisabled ? (
        publishButton
      ) : (
        <Tooltip label={publishTooltipLabel} disabled={!publishTooltipLabel} multiline w={220}>
          <Box>{publishButton}</Box>
        </Tooltip>
      )}

      {tour.status === 'PUBLISHED' ? (
        <Button
          variant="default"
          fullWidth
          leftSection={<IconPlayerStop size={16} />}
          loading={isUnpublishing}
          disabled={busy || !canPublish}
          onClick={onUnpublish}
        >
          {t('unpublish')}
        </Button>
      ) : null}

      {tour.status !== 'ARCHIVED' ? (
        <Button
          variant="light"
          color="red"
          fullWidth
          leftSection={<IconArchive size={16} />}
          loading={isArchiving}
          disabled={busy || !canArchive}
          onClick={onArchive}
        >
          {t('archive')}
        </Button>
      ) : null}
    </Stack>
  );
}
