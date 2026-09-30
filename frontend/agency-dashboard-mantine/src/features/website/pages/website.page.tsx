import { useTranslation } from 'react-i18next';
import { Box } from '@mantine/core';
import { ErrorState } from '../../../components/empty-state.tsx';
import { WebsiteView } from '../components/website-view.tsx';
import { useWebsitePage } from '../hooks/use-website-page.ts';

export function WebsitePage() {
  const { t } = useTranslation('website');
  const controller = useWebsitePage();

  if (controller.isPending) {
    return <Box py="xl" />;
  }

  if (controller.isError || controller.draft === null) {
    return (
      <ErrorState
        title={t('loadError')}
        description={t('notifications.loadFailed')}
        onRetry={controller.refetch}
      />
    );
  }

  return (
    <WebsiteView
      draft={controller.draft}
      tourCatalog={controller.tourCatalog}
      catalogPending={controller.catalogPending}
      isPublished={controller.isPublished}
      canEditContent={controller.canEditContent}
      canPublish={controller.canPublish}
      isSaving={controller.isSaving}
      isPublishing={controller.isPublishing}
      onSave={controller.save}
      onPublish={controller.publish}
      viewWebsite={controller.viewWebsite}
    />
  );
}
