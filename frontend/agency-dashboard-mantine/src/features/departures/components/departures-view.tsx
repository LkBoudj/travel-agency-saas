import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Loader, Select, Stack, Text } from '@mantine/core';
import { ContentContainer } from '../../../components/content-container.tsx';
import { EmptyState } from '../../../components/empty-state.tsx';
import { PageHeader } from '../../../components/page-header.tsx';
import { Panel } from '../../../components/panel.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { useIsRtl } from '../../../i18n/hooks/use-is-rtl.ts';
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
  // The back arrow is directional: it turns with the reading direction.
  const isRtl = useIsRtl();

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
      <ContentContainer>
        <Stack gap="lg">
          <PageHeader title={t('title')} subtitle={t('subtitle')} />
          <Panel>
            <EmptyState
              title={t('noTours')}
              description={t('noToursBody')}
              action={
                <Button
                  variant="light"
                  leftSection={isRtl ? <IconArrowRight size={16} /> : <IconArrowLeft size={16} />}
                  onClick={controller.goToTrips}
                >
                  {t('goToTrips')}
                </Button>
              }
            />
          </Panel>
        </Stack>
      </ContentContainer>
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
    <ContentContainer>
      <Stack gap="lg">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />

        <Panel>
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

            {/* Status and availability are one shared badge now, so the pair can
              never drift apart the way two hand-written chips did. */}
            <StatusBadge status={selected.status} mode={availabilityMode} />

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
        </Panel>

        <Panel>
          <PricingManager
            tourCode={selected.code}
            canCreate={controller.pricing.canManage}
            canEdit={controller.pricing.canManage}
            canDeactivate={controller.pricing.canManage}
          />
        </Panel>
      </Stack>
    </ContentContainer>
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
