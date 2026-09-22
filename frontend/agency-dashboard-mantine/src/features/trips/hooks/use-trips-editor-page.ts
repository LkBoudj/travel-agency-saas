import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { dashboardPaths } from '../../../app/router/route-paths.ts';
import { useConfirmDialog } from '../../../components/confirm-dialog.tsx';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import { requestTour } from '../api/tours.api.ts';
import { tourLabel } from '../lib/tour-display.ts';
import { blockerMessageKey, tripErrorNotificationKey } from '../lib/tour-error-messages.ts';
import { classifyTripError } from '../lib/tour-errors.ts';
import { toursQueryKeys } from '../queries/tours.queries.ts';
import type { TripFormValues } from '../schemas/tour.schema.ts';
import type { Tour } from '../types.ts';
import { useTripCapabilities } from './use-tour-capabilities.ts';
import { useToursMutations } from './use-tours.ts';

export interface TripsEditorPageController {
  tour: Tour | null;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  canUpdate: boolean;
  canPublish: boolean;
  canArchive: boolean;
  isSubmitting: boolean;
  isPublishing: boolean;
  isUnpublishing: boolean;
  isArchiving: boolean;
  justCreated: boolean;
  onBack: () => void;
  submit: (values: TripFormValues) => void;
  publish: () => void;
  unpublish: () => void;
  archive: () => void;
}

export function useTripsEditorPage(): TripsEditorPageController {
  const { t } = useTranslation('trips');
  const navigate = useNavigate();
  const location = useLocation();
  const { tourCode = '' } = useParams<{ tourCode: string }>();
  const { code } = useAgencyContext();
  const confirm = useConfirmDialog();
  const capabilities = useTripCapabilities();
  const { update, publish, unpublish, archive } = useToursMutations();

  const justCreated = (location.state as { justCreated?: boolean } | null)?.justCreated === true;

  const detailQuery = useQuery({
    queryKey: toursQueryKeys.detail(code, tourCode),
    queryFn: () => requestTour(code, tourCode),
    enabled: tourCode.length > 0,
    staleTime: 60_000,
  });

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

  const onBack = () => {
    navigate(dashboardPaths.trips(code));
  };

  const submit = (values: TripFormValues) => {
    if (!tourCode) {
      return;
    }
    update.mutate(
      { tourCode, values },
      {
        onSuccess: () => {
          notifications.show({ message: t('notifications.updated'), color: 'teal' });
        },
        onError: notifyError,
      }
    );
  };

  const publishTour = () => {
    if (!detailQuery.data) {
      return;
    }
    const tour = detailQuery.data;
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

  const unpublishTour = () => {
    if (!detailQuery.data) {
      return;
    }
    const tour = detailQuery.data;
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

  const archiveTour = () => {
    if (!detailQuery.data) {
      return;
    }
    const tour = detailQuery.data;
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
    tour: detailQuery.data ?? null,
    isPending: detailQuery.isPending,
    isError: detailQuery.isError,
    refetch: detailQuery.refetch,
    canUpdate: capabilities.canUpdate,
    canPublish: capabilities.canPublish,
    canArchive: capabilities.canArchive,
    isSubmitting: update.isPending,
    isPublishing: publish.isPending,
    isUnpublishing: unpublish.isPending,
    isArchiving: archive.isPending,
    justCreated,
    onBack,
    submit,
    publish: publishTour,
    unpublish: unpublishTour,
    archive: archiveTour,
  };
}
