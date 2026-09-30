import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useConfirmDialog } from '../../../components/confirm-dialog.tsx';
import { websiteErrorNotificationKey } from '../lib/website-error-messages.ts';
import { classifyWebsiteError } from '../lib/website-errors.ts';
import { buildWebsiteContentPatch } from '../lib/website-payloads.ts';
import type { WebsiteFormValues } from '../schemas/website.schema.ts';
import type { TourCatalogItem, WebsiteDraftResponse } from '../types.ts';
import { useViewWebsite, type ViewWebsiteController } from './use-view-website.ts';
import { useWebsiteCapabilities } from './use-website-capabilities.ts';
import {
  usePublishedWebsite,
  useTourCatalog,
  useWebsiteDraft,
  useWebsiteMutations,
} from './use-website.ts';

export interface WebsitePageController {
  draft: WebsiteDraftResponse | null;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  tourCatalog: TourCatalogItem[];
  catalogPending: boolean;
  isPublished: boolean;
  canEditContent: boolean;
  canPublish: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  save: (values: WebsiteFormValues) => void;
  publish: () => void;
  /** "View website" header action. */
  viewWebsite: ViewWebsiteController;
}

export function useWebsitePage(): WebsitePageController {
  const { t } = useTranslation('website');
  const confirm = useConfirmDialog();
  const capabilities = useWebsiteCapabilities();
  const { saveContent, publish } = useWebsiteMutations();

  const draftQuery = useWebsiteDraft();
  const catalogQuery = useTourCatalog();
  const publishedQuery = usePublishedWebsite();

  const isPublished = publishedQuery.isSuccess;

  const notifyError = (error: unknown) => {
    const { kind } = classifyWebsiteError(error);
    notifications.show({ message: t(websiteErrorNotificationKey(kind)), color: 'red' });
  };

  const save = (values: WebsiteFormValues) => {
    saveContent.mutate(
      { values: buildWebsiteContentPatch(values) },
      {
        onSuccess: () => {
          notifications.show({ message: t('notifications.saved'), color: 'teal' });
        },
        onError: notifyError,
      }
    );
  };

  const publishWebsite = () => {
    confirm({
      title: t('confirm.publishTitle'),
      message: t('confirm.publishBody'),
      onConfirm: () =>
        publish.mutate(undefined, {
          onSuccess: () => {
            notifications.show({ message: t('notifications.published'), color: 'teal' });
          },
          onError: notifyError,
        }),
    });
  };

  return {
    draft: draftQuery.data ?? null,
    isPending: draftQuery.isPending,
    isError: draftQuery.isError,
    refetch: draftQuery.refetch,
    tourCatalog: catalogQuery.data ?? [],
    catalogPending: catalogQuery.isPending,
    isPublished,
    canEditContent: capabilities.canEditContent,
    canPublish: capabilities.canPublish,
    isSaving: saveContent.isPending,
    isPublishing: publish.isPending,
    save,
    publish: publishWebsite,
    viewWebsite: useViewWebsite(),
  };
}
