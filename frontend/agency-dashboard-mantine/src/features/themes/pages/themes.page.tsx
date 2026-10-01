import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Group, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { EmptyState, ErrorState } from '../../../components/empty-state.tsx';
import { DrawerFormShell } from '../../../components/form/drawer-form-shell.tsx';
import { PageHeader } from '../../../components/page-header.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { getEnv } from '../../../config/env.ts';
import { useQualifiedKey } from '../../../i18n/hooks/use-qualified-key.ts';
import { SchemaSettingsRenderer } from '../components/schema-form/schema-settings-renderer.tsx';
import { ThemeCard } from '../components/theme-card.tsx';
import { useThemesPage } from '../hooks/use-themes-page.ts';
import { initialSettingsMap } from '../lib/settings-map.ts';
import { themePreviewUrl } from '../lib/theme-preview-url.ts';
import type { SettingsMap, ThemeManifestEntry } from '../types.ts';

export function ThemesPage() {
  const { t } = useTranslation('themes');
  // Theme manifests ship fully qualified keys (`themes.starter.name`); the
  // resolver falls back to the raw key when a theme has no translation.
  const themeKey = useQualifiedKey();
  const controller = useThemesPage();
  const themesBaseUrl = getEnv().themesBaseUrl;

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customizeSettings, setCustomizeSettings] = useState<SettingsMap>({});

  // Name the live theme from the manifest (never by building a key from an id).
  const liveThemeEntry =
    controller.liveTheme === null
      ? null
      : (controller.manifest.find((theme) => theme.themeId === controller.liveTheme) ?? null);
  const liveThemeLabel =
    liveThemeEntry === null ? t('unknownTheme') : themeKey(liveThemeEntry.nameKey);

  const openCustomize = (theme: ThemeManifestEntry) => {
    setCustomizeSettings(initialSettingsMap(theme.settingsSchema, controller.draft?.themeSettings));
    setCustomizeOpen(true);
  };

  if (controller.manifestPending || controller.draftPending) {
    // Skeleton cards, not a spinner: the page is about to show a grid of theme
    // cards, and reserving their space keeps the page from jumping.
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} withBorder radius="md" p="lg">
            <Skeleton height="var(--app-theme-card-media-height)" radius="sm" />
            <Stack gap="xs" mt="sm">
              <Skeleton height="1rem" width="55%" />
              <Skeleton height="0.75rem" />
              <Skeleton height="0.75rem" width="80%" />
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    );
  }

  if (controller.manifestError || controller.draft === null) {
    return (
      <ErrorState
        title={t('loadErrorTitle')}
        description={t('loadErrorBody')}
        onRetry={controller.refetchManifest}
      />
    );
  }

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Group gap="xs">
            <StatusBadge status={controller.isPublished ? 'published' : 'draft'} />
            {controller.canPublish ? (
              <Button loading={controller.publishing} onClick={controller.publishWebsite}>
                {t('publish')}
              </Button>
            ) : null}
          </Group>
        }
      />

      {controller.publishState === 'unpublished' ? (
        <Alert color="yellow" title={t('noticeUnpublishedTitle')} role="status">
          {t('noticeUnpublishedBody')}
        </Alert>
      ) : null}
      {controller.publishState === 'pending-publish' ? (
        <Alert color="yellow" title={t('noticePendingTitle')} role="status">
          {t('noticePendingBody', { liveTheme: liveThemeLabel })}
        </Alert>
      ) : null}

      {controller.manifest.length === 0 ? (
        <EmptyState title={t('emptyCatalogTitle')} description={t('emptyCatalog')} />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {controller.manifest.map((theme) => (
            <ThemeCard
              key={theme.themeId}
              themeId={theme.themeId}
              name={themeKey(theme.nameKey)}
              description={themeKey(theme.descriptionKey)}
              version={theme.version}
              // The manifest ships a path on the *theme app* origin.
              previewUrl={themePreviewUrl(theme.previewImage, themesBaseUrl)}
              state={controller.cardState(theme.themeId)}
              canEdit={controller.canEditTheme}
              busy={controller.previewing || controller.savingTheme}
              onPreview={() => controller.openPreview('home')}
              onCustomize={() => openCustomize(theme)}
              onActivate={() => controller.activate(theme.themeId)}
            />
          ))}
        </SimpleGrid>
      )}

      <DrawerFormShell
        opened={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title={t('customizeDrawerTitle')}
        size="md"
      >
        {controller.activeTheme === null ? (
          <Text size="sm" c="dimmed">
            {t('noThemeBody')}
          </Text>
        ) : (
          <Stack gap="md">
            <SchemaSettingsRenderer
              schema={controller.activeTheme.settingsSchema}
              value={customizeSettings}
              onChange={setCustomizeSettings}
              disabled={controller.savingTheme}
            />
            <Group justify="flex-end" gap="sm">
              <Button variant="default" onClick={() => setCustomizeOpen(false)}>
                {t('discard')}
              </Button>
              <Button
                loading={controller.savingTheme}
                onClick={() => controller.saveCustomization(customizeSettings)}
              >
                {t('saveLabel')}
              </Button>
            </Group>
          </Stack>
        )}
      </DrawerFormShell>
    </Stack>
  );
}
