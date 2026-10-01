import { useTranslation } from 'react-i18next';
import { Box, Button, Stack } from '@mantine/core';
import { ErrorState } from '../../../components/empty-state.tsx';
import { TripEditor } from '../components/trip-editor.tsx';
import { useTripsEditorPage } from '../hooks/use-trips-editor-page.ts';

export function TripsEditorPage() {
  const { t } = useTranslation('trips');
  const controller = useTripsEditorPage();

  if (controller.isPending) {
    return <Box py="xl" />;
  }

  if (controller.isError || controller.tour === null) {
    return (
      <Stack gap="lg" align="flex-start" py="lg">
        <Button variant="subtle" ps={0} onClick={controller.onBack}>
          {t('editor.backLabel')}
        </Button>
        <ErrorState
          title={t('loadError')}
          description={t('notifications.tourNotFound')}
          onRetry={controller.refetch}
        />
      </Stack>
    );
  }

  return (
    <TripEditor
      tour={controller.tour}
      submitting={controller.isSubmitting}
      canUpdate={controller.canUpdate}
      canPublish={controller.canPublish}
      canArchive={controller.canArchive}
      isPublishing={controller.isPublishing}
      isUnpublishing={controller.isUnpublishing}
      isArchiving={controller.isArchiving}
      justCreated={controller.justCreated}
      onBack={controller.onBack}
      onSubmit={controller.submit}
      onPublish={controller.publish}
      onUnpublish={controller.unpublish}
      onArchive={controller.archive}
    />
  );
}
