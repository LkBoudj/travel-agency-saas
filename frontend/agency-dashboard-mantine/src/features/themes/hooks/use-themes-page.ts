import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useConfirmDialog } from '../../../components/confirm-dialog.tsx';
import {
  useViewWebsite,
  type ViewWebsiteController,
} from '../../website/hooks/use-view-website.ts';
import { useWebsiteCapabilities } from '../../website/hooks/use-website-capabilities.ts';
import {
  usePublishedWebsite,
  useWebsiteDraft,
  useWebsiteMutations,
} from '../../website/hooks/use-website.ts';
import { classifyWebsiteError, type WebsiteErrorKind } from '../../website/lib/website-errors.ts';
import type { WebsiteDraftResponse } from '../../website/types.ts';
import {
  buildActivateThemePatch,
  buildThemePatch,
  initialSettingsMap,
} from '../lib/settings-map.ts';
import {
  liveThemeId,
  themeCardState,
  themePublishState,
  type ThemeCardState,
  type ThemePublishState,
} from '../lib/theme-card-state.ts';
import type { SettingsMap, ThemeManifestEntry } from '../types.ts';
import { useThemesManifest } from './use-themes.ts';

function themesErrorNotificationKey(kind: WebsiteErrorKind): string {
  switch (kind) {
    case 'not-published':
      return 'notifications.notPublished';
    case 'slug-conflict':
      return 'notifications.slugConflict';
    case 'network':
      return 'errors.network';
    default:
      return 'notifications.unknownError';
  }
}

export interface ThemesPageController {
  manifest: ThemeManifestEntry[];
  manifestPending: boolean;
  manifestError: boolean;
  refetchManifest: () => void;
  draft: WebsiteDraftResponse | null;
  draftPending: boolean;
  isPublished: boolean;
  /** Theme the live site serves right now (`null` while unpublished). */
  liveTheme: string | null;
  /** Page-level draft vs live state, for the publish notice. */
  publishState: ThemePublishState;
  /** Card state per manifest entry, so the page never re-derives it. */
  cardState: (themeId: string) => ThemeCardState;
  activeTheme: ThemeManifestEntry | null;
  canEditTheme: boolean;
  canPublish: boolean;
  savingTheme: boolean;
  publishing: boolean;
  previewing: boolean;
  activate: (themeId: string) => void;
  saveCustomization: (settings: SettingsMap) => void;
  openPreview: (page?: 'home' | 'trips', themeId?: string) => void;
  publishWebsite: () => void;
  viewWebsite: ViewWebsiteController;
  customizeOpen: boolean;
  customizeTheme: ThemeManifestEntry | null;
  customizeSettings: SettingsMap;
  setCustomizeSettings: (settings: SettingsMap) => void;
  openCustomize: (theme: ThemeManifestEntry) => void;
  closeCustomize: () => void;
}

export function useThemesPage(): ThemesPageController {
  const { t } = useTranslation('themes');
  const confirm = useConfirmDialog();
  const capabilities = useWebsiteCapabilities();
  const manifestQuery = useThemesManifest();
  const draftQuery = useWebsiteDraft();
  const publishedQuery = usePublishedWebsite();
  const { saveTheme, publish, mintPreview } = useWebsiteMutations();
  const viewWebsite = useViewWebsite();

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customizeTheme, setCustomizeTheme] = useState<ThemeManifestEntry | null>(null);
  const [customizeSettings, setCustomizeSettings] = useState<SettingsMap>({});

  const draft = draftQuery.data ?? null;
  const activeThemeId = draft?.themeId ?? null;
  const rawManifest = manifestQuery.data?.themes ?? [];
  const activeTheme = rawManifest.find((theme) => theme.themeId === activeThemeId) ?? null;
  const isPublished = publishedQuery.isSuccess;
  const publishedThemeId = publishedQuery.data?.themeId ?? null;
  const currentLiveThemeId = liveThemeId(publishedThemeId, isPublished);

  const notifyError = (error: unknown) => {
    const { kind } = classifyWebsiteError(error);
    notifications.show({ message: t(themesErrorNotificationKey(kind)), color: 'red' });
  };

  const activate = (themeId: string) => {
    confirm({
      title: t('confirm.activateTitle'),
      message: t('confirm.activateBody'),
      onConfirm: () =>
        saveTheme.mutate(
          { values: buildActivateThemePatch(themeId) },
          {
            onSuccess: () => {
              notifications.show({ message: t('notifications.activated'), color: 'teal' });
            },
            onError: notifyError,
          }
        ),
    });
  };

  const openCustomize = (theme: ThemeManifestEntry) => {
    setCustomizeTheme(theme);
    setCustomizeSettings(initialSettingsMap(theme.settingsSchema, draft?.themeSettings));
    setCustomizeOpen(true);
  };

  const closeCustomize = () => {
    setCustomizeOpen(false);
    setCustomizeTheme(null);
  };

  const saveCustomization = (settings: SettingsMap) => {
    const targetTheme = customizeTheme ?? activeTheme;
    if (targetTheme === null) {
      return;
    }
    saveTheme.mutate(
      {
        values: buildThemePatch(targetTheme.themeId, targetTheme.settingsSchema, settings),
      },
      {
        onSuccess: () => {
          notifications.show({ message: t('notifications.customizationSaved'), color: 'teal' });
          closeCustomize();
        },
        onError: notifyError,
      }
    );
  };

  const openPreview = (page: 'home' | 'trips' = 'home', themeId?: string) => {
    mintPreview.mutate(
      { page, themeId },
      {
        onSuccess: (response) => {
          window.open(response.previewUrl, '_blank', 'noopener,noreferrer');
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
    manifest: rawManifest,
    manifestPending: manifestQuery.isPending,
    manifestError: manifestQuery.isError,
    refetchManifest: () => void manifestQuery.refetch(),
    draft,
    draftPending: draftQuery.isPending,
    isPublished,
    liveTheme: currentLiveThemeId,
    publishState: themePublishState(activeThemeId, publishedThemeId, isPublished),
    cardState: (themeId: string) => themeCardState(themeId, activeThemeId, publishedThemeId),
    activeTheme,
    canEditTheme: capabilities.canEditTheme,
    canPublish: capabilities.canPublish,
    savingTheme: saveTheme.isPending,
    publishing: publish.isPending,
    previewing: mintPreview.isPending,
    activate,
    saveCustomization,
    openPreview,
    publishWebsite,
    viewWebsite,
    customizeOpen,
    customizeTheme,
    customizeSettings,
    setCustomizeSettings,
    openCustomize,
    closeCustomize,
  };
}
