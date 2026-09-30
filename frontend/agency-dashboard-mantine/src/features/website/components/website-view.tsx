import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Divider, Group, Stack, Tabs, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { EntityCode } from '../../../components/entity-code.tsx';
import { FormActions } from '../../../components/form/form-actions.tsx';
import { PageHeader } from '../../../components/page-header.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import type { ViewWebsiteController } from '../hooks/use-view-website.ts';
import { useWebsiteForm } from '../hooks/use-website-form.ts';
import { websiteToFormValues } from '../lib/website-defaults.ts';
import { firstWebsiteTabWithErrors, type WebsiteTabId } from '../lib/website-validation.ts';
import type { WebsiteFormValues } from '../schemas/website.schema.ts';
import type { WebsiteDraftResponse, TourCatalogItem } from '../types.ts';
import { BrandingSection } from './sections/branding-section.tsx';
import { FooterSection } from './sections/footer-section.tsx';
import { HomeSection } from './sections/home-section.tsx';
import { NavigationSection } from './sections/navigation-section.tsx';
import { ToursSection } from './sections/tours-section.tsx';
import { ViewWebsiteButton } from './view-website-button.tsx';

export interface WebsiteViewProps {
  draft: WebsiteDraftResponse;
  tourCatalog: TourCatalogItem[];
  catalogPending: boolean;
  isPublished: boolean;
  canEditContent: boolean;
  canPublish: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  onSave: (values: WebsiteFormValues) => void;
  onPublish: () => void;
  viewWebsite: ViewWebsiteController;
}

export function WebsiteView({
  draft,
  tourCatalog,
  catalogPending,
  isPublished,
  canEditContent,
  canPublish,
  isSaving,
  isPublishing,
  onSave,
  onPublish,
  viewWebsite,
}: WebsiteViewProps) {
  const { t } = useTranslation('website');
  const form = useWebsiteForm(websiteToFormValues(draft));
  const [tab, setTab] = useState<WebsiteTabId>('home');

  // A rejected submit must never look like a no-op: jump to the tab that owns
  // the first failing field and say so.
  const onInvalid = (errors: Record<string, unknown>) => {
    const failedTab = firstWebsiteTabWithErrors(errors);
    if (failedTab) {
      setTab(failedTab);
    }
    notifications.show({ message: t('notifications.invalidFields'), color: 'red' });
  };

  const renderSection = () => {
    switch (tab) {
      case 'home':
        return <HomeSection form={form} />;
      case 'tours':
        return <ToursSection form={form} catalog={tourCatalog} catalogPending={catalogPending} />;
      case 'navigation':
        return <NavigationSection form={form} />;
      case 'footer':
        return <FooterSection form={form} />;
      case 'branding':
        return <BrandingSection form={form} />;
    }
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Group gap="xs">
            <EntityCode code={draft.slug} />
            <ViewWebsiteButton controller={viewWebsite} />
            <StatusBadge status={isPublished ? 'published' : 'draft'} />
            {canPublish ? (
              <Button loading={isPublishing} onClick={onPublish}>
                {t('publish')}
              </Button>
            ) : null}
          </Group>
        }
      />

      <form onSubmit={form.onSubmit(onSave, onInvalid)}>
        <Stack gap="md">
          <Tabs value={tab} onChange={(value) => setTab((value ?? 'home') as WebsiteTabId)}>
            <Tabs.List>
              <Tabs.Tab value="home">{t('tabs.home')}</Tabs.Tab>
              <Tabs.Tab value="tours">{t('tabs.tours')}</Tabs.Tab>
              <Tabs.Tab value="navigation">{t('tabs.navigation')}</Tabs.Tab>
              <Tabs.Tab value="footer">{t('tabs.footer')}</Tabs.Tab>
              <Tabs.Tab value="branding">{t('tabs.branding')}</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value={tab} pt="lg">
              {renderSection()}
            </Tabs.Panel>
          </Tabs>

          <Divider />

          {canEditContent ? (
            <FormActions submitLabel={t('saveLabel')} submitting={isSaving} />
          ) : (
            <Text size="sm" c="dimmed">
              {t('readOnlyHint')}
            </Text>
          )}
        </Stack>
      </form>
    </Stack>
  );
}
