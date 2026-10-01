import { IconWorld } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Box, Card, Group, Skeleton, Stack, Text, Title } from '@mantine/core';
import { ViewWebsiteButton } from '../../website/components/view-website-button.tsx';
import type { ViewWebsiteController } from '../../website/hooks/use-view-website.ts';
import type { OverviewSiteStatus } from '../hooks/use-overview-page.ts';

/**
 * The public site's state, beside the recent bookings.
 *
 * Read-only by design: it answers "is my site live, and where does it live",
 * and the one action it offers opens the site (or a signed draft preview). The
 * editing stays on the Website page — a status card that could also publish
 * would be the wrong place to make that call.
 */
export function SiteStatusCard({
  site,
  viewWebsite,
}: {
  site: OverviewSiteStatus;
  viewWebsite: ViewWebsiteController;
}) {
  const { t } = useTranslation('dashboard');

  return (
    <Card withBorder radius="md" p="lg" h="100%">
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Title order={2} fz="md">
            {t('site.title')}
          </Title>
          <Box
            bg="var(--app-surface-sunken)"
            c="dimmed"
            p={6}
            style={{ borderRadius: 'var(--mantine-radius-md)', display: 'flex' }}
          >
            <IconWorld size={16} stroke={1.5} aria-hidden />
          </Box>
        </Group>

        {site.isLoading ? (
          <Stack gap="xs">
            <Skeleton height={14} width="60%" />
            <Skeleton height={14} width="40%" />
          </Stack>
        ) : (
          <Stack gap={2}>
            <Text fw={600}>{site.isPublished ? t('site.published') : t('site.draft')}</Text>
            <Text size="sm" c="dimmed">
              {site.isPublished ? t('site.publishedBody') : t('site.draftBody')}
            </Text>
            {site.slug ? (
              // A slug is LTR data inside an RTL sentence: `dir="auto"` keeps the
              // dot separators and hyphen from being reordered.
              <Text size="xs" c="dimmed" ff="monospace" dir="auto">
                {site.slug}
              </Text>
            ) : null}
          </Stack>
        )}

        <Group>
          <ViewWebsiteButton controller={viewWebsite} />
        </Group>
      </Stack>
    </Card>
  );
}
