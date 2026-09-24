import { IconArrowLeft } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Group, Loader, Select, Stack, Text } from '@mantine/core';
import { EmptyState } from '../../../components/empty-state.tsx';
import { PageHeader } from '../../../components/page-header.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { PricingManager } from '../../pricing/components/pricing-manager.tsx';
import { tourLabel } from '../../trips/lib/tour-display.ts';
import type { AvailabilityMode } from '../../trips/types.ts';
import type { DeparturesPageController } from '../hooks/use-departures-page.ts';
import { DeparturesManager } from './departures-manager.tsx';

interface DeparturesViewProps {
  controller: DeparturesPageController;
}

/** Handed to the managers; encoding stays here so the managers stay dumb. */
function buildManagerProps(controller: DeparturesPageController) {
  const caps = controller.departure;
  const pricing = controller.pricing;
  return {
    canCreate: caps.canCreate,
    canUpdate: caps.canUpdate,
    canCancel: caps.canCancel,
    canManagePrices: pricing.canManage,
  };
}

export function DeparturesView({ controller }: DeparturesViewProps) {
  const { t } = useTranslation('departures');

  if (controller.toursPending) {
    return (
      <Stack align="center" py="xl">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          {t('loading')}
        </Text>
      </Stack>
    );
  }

  if (controller.toursEmpty) {
    return (
      <Stack gap="md">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <Card withBorder>
          <EmptyState
            title={t('noTours')}
            description={t('noToursBody')}
            action={
              <Button
                variant="light"
                leftSection={<IconArrowLeft size={16} />}
                onClick={controller.goToTrips}
              >
                {t('goToTrips')}
              </Button>
            }
          />
        </Card>
      </Stack>
    );
  }

  const selected = controller.selected;
  if (!selected) {
    return null;
  }

  const availabilityMode = selected.availabilityMode;
  const managerProps = buildManagerProps(controller);
  const showDepartures = availabilityMode === 'scheduled';

  return (
    <Stack gap="md">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Card withBorder p="md">
        <Stack gap="md">
          <Select
            label={t('tourSelectLabel')}
            placeholder={t('tourSelectPlaceholder')}
            data={controller.tours.map((tour) => ({
              value: tour.code,
              label: `${tourLabel(tour)} (${tour.code})`,
            }))}
            value={selected.code}
            onChange={controller.selectTour}
            searchable
            allowDeselect={false}
            withAsterisk={false}
            styles={{ root: { maxWidth: 420 } }}
          />

          <Group gap="sm">
            <StatusBadge status={selected.status} />
            <Badge variant="light" color="gray" tt="none">
              {t(`availability.${availabilityMode}`)}
            </Badge>
          </Group>

          {showDepartures ? (
            <DeparturesManager
              tourCode={selected.code}
              tourStatus={selected.status}
              {...managerProps}
              tourModeKey={availabilityMode}
            />
          ) : (
            <AvailabilityInfo mode={availabilityMode} />
          )}
        </Stack>
      </Card>

      <Card withBorder p="md">
        <PricingManager
          tourCode={selected.code}
          canCreate={controller.pricing.canManage}
          canEdit={controller.pricing.canManage}
          canDeactivate={controller.pricing.canManage}
        />
      </Card>
    </Stack>
  );
}

/** Explains why a non-scheduled tour shows no departures section. */
function AvailabilityInfo({ mode }: { mode: AvailabilityMode }) {
  const { t } = useTranslation('departures');
  if (mode === 'scheduled') {
    return null;
  }
  const bodyKey = mode === 'on_request' ? 'bodyOnRequest' : 'bodyCustomQuote';
  return (
    <Stack gap={2}>
      <Text size="sm" fw={600}>
        {t('availabilityInfo.title')}
      </Text>
      <Text size="sm" c="dimmed">
        {t(`availabilityInfo.${bodyKey}`)}
      </Text>
      <Text size="sm" c="dimmed">
        {t('availabilityInfo.helper')}
      </Text>
    </Stack>
  );
}
