import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Box, Divider, Group, Stack, Text } from '@mantine/core';
import { EntityCode } from '../../../components/entity-code.tsx';
import { FormActions } from '../../../components/form/form-actions.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { tripToFormValues, useTripForm } from '../hooks/use-tour-form.ts';
import type { TripFormValues } from '../schemas/tour.schema.ts';
import type { Tour } from '../types.ts';
import { TripCategoriesSection } from './sections/trip-categories-section.tsx';
import { TripContentSection } from './sections/trip-content-section.tsx';
import { TripDestinationsSection } from './sections/trip-destinations-section.tsx';
import { TripDetailsSection } from './sections/trip-details-section.tsx';
import { TripItinerarySection } from './sections/trip-itinerary-section.tsx';
import { TripListsSection } from './sections/trip-lists-section.tsx';
import { TripOverviewSection } from './sections/trip-overview-section.tsx';
import { TripRequirementsSection } from './sections/trip-requirements-section.tsx';
import { TripEditorNav, type TripEditorSectionId } from './trip-editor-nav.tsx';
import { TripReadinessPanel } from './trip-readiness-panel.tsx';

export interface TripEditorProps {
  tour: Tour;
  submitting: boolean;
  canUpdate: boolean;
  canPublish: boolean;
  canArchive: boolean;
  isPublishing: boolean;
  isUnpublishing: boolean;
  isArchiving: boolean;
  justCreated: boolean;
  onBack: () => void;
  onSubmit: (values: TripFormValues) => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onArchive: () => void;
}

export function TripEditor({
  tour,
  submitting,
  canUpdate,
  canPublish,
  canArchive,
  isPublishing,
  isUnpublishing,
  isArchiving,
  justCreated,
  onBack,
  onSubmit,
  onPublish,
  onUnpublish,
  onArchive,
}: TripEditorProps) {
  const { t } = useTranslation('trips');
  const form = useTripForm(tripToFormValues(tour));
  const [section, setSection] = useState<TripEditorSectionId>('overview');
  const nightsTouchedRef = useRef(false);

  const handleSubmit = form.onSubmit(onSubmit);

  const renderSection = () => {
    switch (section) {
      case 'overview':
        return <TripOverviewSection form={form} nightsTouchedRef={nightsTouchedRef} />;
      case 'destinations':
        return <TripDestinationsSection form={form} />;
      case 'content':
        return <TripContentSection form={form} />;
      case 'categories':
        return <TripCategoriesSection form={form} />;
      case 'lists':
        return <TripListsSection form={form} />;
      case 'itinerary':
        return <TripItinerarySection form={form} />;
      case 'details':
        return <TripDetailsSection form={form} />;
      case 'requirements':
        return <TripRequirementsSection form={form} />;
    }
  };

  return (
    <Box maw={1240} mx="auto">
      <form onSubmit={handleSubmit}>
        <Stack gap={0}>
          <Group justify="space-between" py="md" wrap="nowrap">
            <Stack gap={2}>
              <Text fw={600} size="md" lineClamp={1}>
                {tour.name.trim().length > 0 ? tour.name : t('editor.untitled')}
              </Text>
              <Group gap="xs" wrap="nowrap">
                <Text size="xs" c="dimmed">
                  {justCreated ? t('editor.welcomeHint') : t('editor.subtitleEdit')}
                </Text>
                <EntityCode code={tour.code} />
              </Group>
            </Stack>
            <Group gap="xs" wrap="nowrap">
              {justCreated ? (
                <Badge variant="light" color="brand">
                  {t('editor.newDraft')}
                </Badge>
              ) : null}
              <StatusBadge status={tour.status} />
            </Group>
          </Group>

          <Divider />

          <Group align="flex-start" wrap="nowrap" gap="lg" py="md">
            <Box w={190} style={{ position: 'sticky', top: 0 }}>
              <TripEditorNav active={section} onChange={setSection} />
            </Box>

            <Stack flex={1} gap="md">
              {renderSection()}
              <Divider />
              {canUpdate ? (
                <FormActions
                  submitLabel={t('editor.submitEdit')}
                  cancelLabel={t('editor.backLabel')}
                  onCancel={onBack}
                  submitting={submitting}
                />
              ) : (
                <Text size="sm" c="dimmed">
                  {t('editor.readOnlyHint')}
                </Text>
              )}
            </Stack>

            <Box w={290} style={{ position: 'sticky', top: 0 }}>
              <TripReadinessPanel
                tour={tour}
                values={form.values}
                canPublish={canPublish}
                canArchive={canArchive}
                isPublishing={isPublishing}
                isUnpublishing={isUnpublishing}
                isArchiving={isArchiving}
                onPublish={onPublish}
                onUnpublish={onUnpublish}
                onArchive={onArchive}
              />
            </Box>
          </Group>
        </Stack>
      </form>
    </Box>
  );
}
