import { IconBuilding, IconCalendarCheck, IconRoute, IconUsersGroup } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Grid, Group, SimpleGrid, Stack, Title, VisuallyHidden } from '@mantine/core';
import { ContentContainer } from '../../../components/content-container.tsx';
import { ErrorState } from '../../../components/empty-state.tsx';
import { PageHeader } from '../../../components/page-header.tsx';
import { StatCard } from '../../../components/stat-card.tsx';
import { BookingsTable } from '../../bookings/components/bookings-table.tsx';
import { ViewWebsiteButton } from '../../website/components/view-website-button.tsx';
import type { OverviewPageController } from '../hooks/use-overview-page.ts';
import { SiteStatusCard } from './site-status-card.tsx';

/** Rows the recent-bookings table reserves while loading. */
const SKELETON_ROWS = 8;

/**
 * The overview screen, in two bands: what the agency has (counts), then what
 * just happened (recent bookings) beside where the public site stands.
 *
 * Sections the member cannot view are omitted entirely — nothing is hidden,
 * nothing is fetched for them — and the controller owns every decision, so
 * this file is layout only.
 */
export function OverviewView({ controller }: { controller: OverviewPageController }) {
  const { t } = useTranslation('dashboard');
  const kpis = controller.kpis;

  const sectionLabel = (key: string) => t(`kpis.${key}`);

  const kpiCards = [
    controller.canView.customers ? (
      <StatCard
        key="customers"
        label={sectionLabel('customers')}
        value={kpis.customers}
        sub={t('kpis.active', { count: kpis.customers })}
        icon={<IconBuilding size={16} stroke={1.5} aria-hidden />}
        onClick={controller.goToCustomers}
      />
    ) : null,
    controller.canView.tours ? (
      <StatCard
        key="tours"
        label={sectionLabel('tours')}
        value={kpis.tours}
        sub={t('kpis.published', { count: kpis.publishedTours })}
        icon={<IconRoute size={16} stroke={1.5} aria-hidden />}
        onClick={controller.goToTours}
      />
    ) : null,
    controller.canView.bookings ? (
      <StatCard
        key="bookings"
        label={sectionLabel('bookings')}
        value={kpis.bookings}
        sub={t('kpis.pending', { count: kpis.pendingBookings })}
        icon={<IconCalendarCheck size={16} stroke={1.5} aria-hidden />}
        onClick={controller.goToBookings}
      />
    ) : null,
    controller.canView.members ? (
      <StatCard
        key="members"
        label={sectionLabel('members')}
        value={kpis.members}
        sub={t('kpis.active', { count: kpis.members })}
        icon={<IconUsersGroup size={16} stroke={1.5} aria-hidden />}
        onClick={controller.goToMembers}
      />
    ) : null,
  ].filter((card) => card !== null);

  const showRecent = controller.canView.bookings;
  const showSite = controller.canView.website;

  return (
    <ContentContainer>
      <Stack gap="xl">
        <PageHeader
          title={t('page.title')}
          subtitle={t('page.subtitle')}
          actions={
            <>
              {controller.quickActions.map((action) => (
                <Button key={action.key} variant="default" size="sm" onClick={action.run}>
                  {action.label}
                </Button>
              ))}
              {showSite ? <ViewWebsiteButton controller={controller.viewWebsite} /> : null}
            </>
          }
        />

        {kpiCards.length > 0 ? (
          <Stack gap="sm">
            {/* The tiles carry their own labels visually; the group still needs a
                real heading so the page is navigable by heading. */}
            <VisuallyHidden>
              <Title order={2}>{t('sections.snapshot')}</Title>
            </VisuallyHidden>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              {kpiCards}
            </SimpleGrid>
          </Stack>
        ) : null}

        {showRecent || showSite ? (
          // Two equal bands would compete for attention; the bookings list is
          // the thing to act on, so it takes two thirds and the read-only site
          // status sits beside it.
          <Grid gap="md">
            {showRecent ? (
              <Grid.Col span={{ base: 12, lg: showSite ? 8 : 12 }}>
                <Stack gap="md">
                  <Group justify="space-between" align="center" gap="sm" wrap="wrap">
                    <Title order={2} fz="md">
                      {t('recent.title')}
                    </Title>
                    {/* No directional icon here: an arrow would point the wrong way
                        in RTL. The label says where the button leads. */}
                    <Button variant="subtle" size="compact-sm" onClick={controller.goToBookings}>
                      {t('kpis.viewAll', { section: t('kpis.bookings') })}
                    </Button>
                  </Group>
                  {controller.isError ? (
                    <ErrorState
                      title={t('page.errorTitle')}
                      description={t('page.errorBody')}
                      onRetry={controller.refetchVisible}
                    />
                  ) : (
                    <BookingsTable
                      bookings={controller.bookings}
                      loading={controller.isLoading}
                      skeletonRows={SKELETON_ROWS}
                      onViewDetails={controller.openBooking}
                      emptyAction={
                        <Button variant="light" onClick={controller.goToBookings}>
                          {t('kpis.viewAll', { section: t('kpis.bookings') })}
                        </Button>
                      }
                    />
                  )}
                </Stack>
              </Grid.Col>
            ) : null}

            {showSite ? (
              <Grid.Col span={{ base: 12, lg: showRecent ? 4 : 12 }}>
                <SiteStatusCard site={controller.site} viewWebsite={controller.viewWebsite} />
              </Grid.Col>
            ) : null}
          </Grid>
        ) : null}
      </Stack>
    </ContentContainer>
  );
}
