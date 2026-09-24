import { IconBuilding, IconCalendarCheck, IconRoute, IconUsersGroup } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Card, Loader, SimpleGrid, Stack, Text } from '@mantine/core';
import { ErrorState } from '../../../components/empty-state.tsx';
import { PageHeader } from '../../../components/page-header.tsx';
import { BookingsTable } from '../../bookings/components/bookings-table.tsx';
import type { OverviewPageController } from '../hooks/use-overview-page.ts';
import { KpiCard } from './kpi-card.tsx';

/**
 * The overview screen: permission-aware KPI cards over the feature list
 * queries + the five most recent bookings. Sections the member cannot view
 * are omitted entirely — nothing is hidden, nothing is fetched for them.
 */
export function OverviewView({ controller }: { controller: OverviewPageController }) {
  const { t } = useTranslation('dashboard');
  const kpis = controller.kpis;

  const sectionLabel = (key: string) => t(`kpis.${key}`);

  const kpiCards = [
    controller.canView.customers ? (
      <KpiCard
        key="customers"
        label={sectionLabel('customers')}
        value={kpis.customers}
        sub={t('kpis.active', { count: kpis.customers })}
        icon={<IconBuilding size={18} stroke={1.5} />}
        onClick={controller.goToCustomers}
      />
    ) : null,
    controller.canView.tours ? (
      <KpiCard
        key="tours"
        label={sectionLabel('tours')}
        value={kpis.tours}
        sub={t('kpis.published', { count: kpis.publishedTours })}
        icon={<IconRoute size={18} stroke={1.5} />}
        onClick={controller.goToTours}
      />
    ) : null,
    controller.canView.bookings ? (
      <KpiCard
        key="bookings"
        label={sectionLabel('bookings')}
        value={kpis.bookings}
        sub={t('kpis.pending', { count: kpis.pendingBookings })}
        icon={<IconCalendarCheck size={18} stroke={1.5} />}
        onClick={controller.goToBookings}
      />
    ) : null,
    controller.canView.members ? (
      <KpiCard
        key="members"
        label={sectionLabel('members')}
        value={kpis.members}
        sub={t('kpis.active', { count: kpis.members })}
        icon={<IconUsersGroup size={18} stroke={1.5} />}
        onClick={controller.goToMembers}
      />
    ) : null,
  ].filter((card) => card !== null);

  return (
    <Stack gap="md">
      <PageHeader title={t('page.title')} subtitle={t('page.subtitle')} />

      {kpiCards.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
          {kpiCards}
        </SimpleGrid>
      ) : null}

      {controller.canView.bookings ? (
        <Card withBorder radius="md" p="md">
          <Stack gap="md">
            <Text fw={600}>{t('recent.title')}</Text>
            {controller.isLoading && controller.bookings.length === 0 ? (
              <Loader size="sm" />
            ) : controller.isError ? (
              <ErrorState
                title={t('page.errorTitle')}
                description={t('page.errorBody')}
                onRetry={controller.refetchVisible}
              />
            ) : (
              <BookingsTable
                bookings={controller.bookings}
                onViewDetails={controller.openBooking}
              />
            )}
          </Stack>
        </Card>
      ) : null}
    </Stack>
  );
}
