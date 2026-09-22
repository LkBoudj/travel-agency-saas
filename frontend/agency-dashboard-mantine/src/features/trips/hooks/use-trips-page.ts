import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { dashboardPaths } from '../../../app/router/route-paths.ts';
import { useConfirmDialog } from '../../../components/confirm-dialog.tsx';
import { useDebouncedSearch } from '../../../components/search-input.tsx';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import { quickCreateToTripFormValues } from '../lib/quick-create.ts';
import { knownDestinationPlaces, tourLabel } from '../lib/tour-display.ts';
import { blockerMessageKey, tripErrorNotificationKey } from '../lib/tour-error-messages.ts';
import { classifyTripError } from '../lib/tour-errors.ts';
import type { QuickCreateFormValues } from '../schemas/quick-create.schema.ts';
import type { TourListRow, TourStatus } from '../types.ts';
import { useTripCapabilities } from './use-tour-capabilities.ts';
import { useTours, useToursMutations } from './use-tours.ts';

export type TourActionTarget = Pick<TourListRow, 'code' | 'name' | 'status'>;

export interface TripsPageController {
  tours: TourListRow[];
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  search: ReturnType<typeof useDebouncedSearch>;
  status: TourStatus | 'all';
  setStatus: (status: TourStatus | 'all') => void;
  canCreate: boolean;
  canUpdate: boolean;
  canPublish: boolean;
  canArchive: boolean;
  suggestedDestinations: string[];
  isQuickCreateOpen: boolean;
  openCreateDialog: () => void;
  closeQuickCreate: () => void;
  submitQuickCreate: (values: QuickCreateFormValues) => void;
  openEditDialog: (tour: TourListRow) => void;
  isSubmitting: boolean;
  isPublishing: boolean;
  isUnpublishing: boolean;
  isArchiving: boolean;
  publishTour: (tour: TourActionTarget) => void;
  unpublishTour: (tour: TourActionTarget) => void;
  archiveTour: (tour: TourActionTarget) => void;
}

export function useTripsPage(): TripsPageController {
  const { t } = useTranslation('trips');
  const navigate = useNavigate();
  const { code } = useAgencyContext();
  const confirm = useConfirmDialog();
  const capabilities = useTripCapabilities();
  const { raw, value, setRaw } = useDebouncedSearch();
  const [status, setStatus] = useState<TourStatus | 'all'>('all');

  const toursQuery = useTours(value, status === 'all' ? undefined : status);
  const { create, publish, unpublish, archive } = useToursMutations();

  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  const notifyError = (error: unknown) => {
    const { kind, blockers } = classifyTripError(error);
    const messageKey = tripErrorNotificationKey(kind);
    if (kind === 'publish-blocked' && blockers && blockers.length > 0) {
      notifications.show({
        title: t(messageKey),
        message: blockers.map((blocker) => t(blockerMessageKey(blocker))).join('\n'),
        color: 'red',
        autoClose: 8000,
      });
      return;
    }
    notifications.show({ message: t(messageKey), color: 'red' });
  };

  const openCreateDialog = () => setQuickCreateOpen(true);
  const closeQuickCreate = () => setQuickCreateOpen(false);

  const openEditDialog = (tour: TourListRow) => {
    navigate(dashboardPaths.tripsDetail(code, tour.code));
  };

  const submitQuickCreate = (values: QuickCreateFormValues) => {
    create.mutate(
      { values: quickCreateToTripFormValues(values) },
      {
        onSuccess: (created) => {
          setQuickCreateOpen(false);
          notifications.show({ message: t('notifications.created'), color: 'teal' });
          navigate(dashboardPaths.tripsDetail(code, created.code), {
            state: { justCreated: true },
          });
        },
        onError: notifyError,
      }
    );
  };

  const publishTour = (tour: TourActionTarget) => {
    confirm({
      title: t('confirm.publishTitle', { name: tourLabel(tour) }),
      message: t('confirm.publishBody'),
      onConfirm: () =>
        publish.mutate(
          { tourCode: tour.code },
          {
            onSuccess: () =>
              notifications.show({ message: t('notifications.published'), color: 'teal' }),
            onError: notifyError,
          }
        ),
    });
  };

  const unpublishTour = (tour: TourActionTarget) => {
    confirm({
      title: t('confirm.unpublishTitle', { name: tourLabel(tour) }),
      message: t('confirm.unpublishBody'),
      onConfirm: () =>
        unpublish.mutate(
          { tourCode: tour.code },
          {
            onSuccess: () =>
              notifications.show({ message: t('notifications.unpublished'), color: 'teal' }),
            onError: notifyError,
          }
        ),
    });
  };

  const archiveTour = (tour: TourActionTarget) => {
    confirm({
      title: t('confirm.archiveTitle', { name: tourLabel(tour) }),
      message: t('confirm.archiveBody'),
      color: 'red',
      onConfirm: () =>
        archive.mutate(
          { tourCode: tour.code },
          {
            onSuccess: () =>
              notifications.show({ message: t('notifications.archived'), color: 'teal' }),
            onError: notifyError,
          }
        ),
    });
  };

  return {
    tours: toursQuery.data ?? [],
    isPending: toursQuery.isPending,
    isError: toursQuery.isError,
    refetch: toursQuery.refetch,
    search: { raw, value, setRaw },
    status,
    setStatus,
    canCreate: capabilities.canCreate,
    canUpdate: capabilities.canUpdate,
    canPublish: capabilities.canPublish,
    canArchive: capabilities.canArchive,
    suggestedDestinations: knownDestinationPlaces(toursQuery.data ?? []),
    isQuickCreateOpen: quickCreateOpen,
    openCreateDialog,
    closeQuickCreate,
    submitQuickCreate,
    isSubmitting: create.isPending,
    isPublishing: publish.isPending,
    isUnpublishing: unpublish.isPending,
    isArchiving: archive.isPending,
    openEditDialog,
    publishTour,
    unpublishTour,
    archiveTour,
  };
}
