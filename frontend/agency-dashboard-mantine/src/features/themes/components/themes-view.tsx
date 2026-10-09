import { useState } from 'react';
import { IconEye } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Group, SimpleGrid, Skeleton, Stack, Text } from '@mantine/core';
import { ContentContainer } from '../../../components/content-container.tsx';
import { EmptyState, ErrorState } from '../../../components/empty-state.tsx';
import { DrawerFormShell } from '../../../components/form/drawer-form-shell.tsx';
import { PageHeader } from '../../../components/page-header.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { getEnv } from '../../../config/env.ts';
import { useQualifiedKey } from '../../../i18n/hooks/use-qualified-key.ts';
import type { ThemesPageController } from '../hooks/use-themes-page.ts';
import { themePreviewUrl } from '../lib/theme-preview-url.ts';
import type { ThemeManifestEntry } from '../types.ts';
import { SchemaSettingsRenderer } from './schema-form/schema-settings-renderer.tsx';
import { ThemeCard } from './theme-card.tsx';

export function ThemesView(controller: ThemesPageController) {
  const { t } = useTranslation('themes');
  const themeKey = useQualifiedKey();
  const themesBaseUrl = getEnv().themesBaseUrl;

  const [localCustomizeOpen, setLocalCustomizeOpen] = useState(false);
  const [localTheme, setLocalTheme] = useState<ThemeManifestEntry | null>(null);

  const isCustomizeOpen = controller.customizeOpen || localCustomizeOpen;
  const currentTheme = controller.customizeTheme ?? localTheme ?? controller.activeTheme;

  const handleOpenCustomize = (theme: ThemeManifestEntry) => {
    setLocalTheme(theme);
    setLocalCustomizeOpen(true);
    controller.openCustomize?.(theme);
  };

  const handleCloseCustomize = () => {
    setLocalCustomizeOpen(false);
    controller.closeCustomize?.();
  };

  const liveThemeEntry =
    controller.liveTheme === null
      ? null
      : (controller.manifest.find((theme) => theme.themeId === controller.liveTheme) ?? null);
  const liveThemeLabel =
    liveThemeEntry === null ? t('unknownTheme') : themeKey(liveThemeEntry.nameKey);

  if (controller.manifestPending || controller.draftPending) {
    return (
      <ContentContainer>
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
      </ContentContainer>
    );
  }

  if (controller.manifestError || controller.draft === null) {
    return (
      <ContentContainer>
        <ErrorState
          title={t('loadErrorTitle')}
          description={t('loadErrorBody')}
          onRetry={controller.refetchManifest}
        />
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      <Stack gap="lg">
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
          actions={
            <Group gap="xs" wrap="nowrap">
              <StatusBadge status={controller.isPublished ? 'published' : 'draft'} />
              <Button
                variant="default"
                size="sm"
                leftSection={<IconEye size={16} />}
                onClick={controller.viewWebsite?.open}
                loading={controller.viewWebsite?.isOpening}
              >
                {t('viewWebsite', { defaultValue: 'View Website' })}
              </Button>
              {controller.canPublish ? (
                <Button
                  color="blue"
                  loading={controller.publishing}
                  onClick={controller.publishWebsite}
                  styles={{
                    root: {
                      backgroundColor: 'var(--app-action-primary)',
                      fontWeight: 600,
                    },
                  }}
                >
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
                previewUrl={themePreviewUrl(theme.previewImage, themesBaseUrl)}
                state={controller.cardState(theme.themeId)}
                canEdit={controller.canEditTheme}
                busy={controller.previewing || controller.savingTheme}
                onPreview={() => controller.openPreview('home', theme.themeId)}
                onCustomize={() => handleOpenCustomize(theme)}
                onActivate={() => controller.activate(theme.themeId)}
              />
            ))}
          </SimpleGrid>
        )}

        <DrawerFormShell
          opened={isCustomizeOpen}
          onClose={handleCloseCustomize}
          title={t('customizeDrawerTitle')}
          size="md"
        >
          {currentTheme === null ? (
            <Text size="sm" c="dimmed">
              {t('noThemeBody')}
            </Text>
          ) : (
            <Stack gap="md">
              <SchemaSettingsRenderer
                schema={currentTheme.settingsSchema}
                value={controller.customizeSettings}
                onChange={controller.setCustomizeSettings}
                disabled={controller.savingTheme}
              />
              <Group justify="flex-end" gap="sm">
                <Button variant="default" onClick={handleCloseCustomize}>
                  {t('discard')}
                </Button>
                <Button
                  color="blue"
                  loading={controller.savingTheme}
                  onClick={() => controller.saveCustomization(controller.customizeSettings)}
                  styles={{
                    root: {
                      backgroundColor: 'var(--app-action-primary)',
                      fontWeight: 600,
                    },
                  }}
                >
                  {t('saveLabel')}
                </Button>
              </Group>
            </Stack>
          )}
        </DrawerFormShell>
      </Stack>
    </ContentContainer>
  );
}
