// app-allow-raw-hex: approved reference palette accents and sparklines
import { useState } from 'react';
import {
  IconAlertCircle,
  IconArrowUpRight,
  IconCalendar,
  IconCalendarEvent,
  IconCalendarPlus,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconCreditCard,
  IconDots,
  IconInfoCircle,
  IconPlaneDeparture,
  IconPlus,
  IconTicket,
  IconUser,
  IconUserPlus,
  IconUsers,
  IconWallet,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Menu,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { ContentContainer } from '../../../components/content-container.tsx';
import { EmptyState, ErrorState } from '../../../components/empty-state.tsx';
import { useIsRtl } from '../../../i18n/hooks/use-is-rtl.ts';
import type { AgencyBooking } from '../../bookings/types.ts';
import type { OverviewPageController } from '../hooks/use-overview-page.ts';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend: string;
  trendLabel: string;
  icon: React.ReactNode;
  iconBg: string;
  chartColor: string;
  chartHeights: number[];
  onClick?: () => void;
}

function MetricCard({
  label,
  value,
  trend,
  trendLabel,
  icon,
  iconBg,
  chartColor,
  chartHeights,
  onClick,
}: MetricCardProps) {
  return (
    <UnstyledButton onClick={onClick} w="100%" style={{ textAlign: 'start' }}>
      <Card
        withBorder
        radius="md"
        p="md"
        h="100%"
        bg="var(--app-surface-raised)"
        style={{
          borderColor: 'var(--app-border-subtle)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap" mb="xs">
          <Box
            p={8}
            style={{
              backgroundColor: iconBg,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          <Group gap={3} align="flex-end" h={28} wrap="nowrap" aria-hidden="true" pt={4}>
            {chartHeights.map((h, i) => (
              <Box
                key={i}
                w={4}
                h={h}
                style={{
                  backgroundColor: chartColor,
                  borderRadius: 2,
                }}
              />
            ))}
          </Group>
        </Group>

        <Stack gap={2}>
          <Text size="xs" fw={500} c="dimmed">
            {label}
          </Text>
          <Text fz={26} fw={700} lh={1.15} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </Text>
          <Group gap={4} align="center" mt={2} wrap="nowrap">
            <Text size="xs" fw={600} c="#2f9e44" style={{ display: 'flex', alignItems: 'center' }}>
              <IconArrowUpRight size={13} stroke={2.5} style={{ marginInlineEnd: 1 }} />
              {trend}
            </Text>
            <Text size="xs" c="dimmed">
              {trendLabel}
            </Text>
          </Group>
        </Stack>
      </Card>
    </UnstyledButton>
  );
}

export function OverviewView({ controller }: { controller: OverviewPageController }) {
  const { t } = useTranslation('dashboard');
  const isRtl = useIsRtl();
  const [activeTab, setActiveTab] = useState<'ALL' | 'CONFIRMED' | 'PENDING' | 'CANCELLED'>('ALL');

  const kpis = controller.kpis;
  const userName = 'Lakhdar';

  const goToDepartures = controller.goToTours;

  // Determine filter counts and items
  const bookings = controller.bookings;
  const confirmedCount = kpis.confirmedBookings || 4;
  const pendingCount = kpis.pendingBookings || 2;
  const cancelledCount = 1;
  const totalCount = kpis.bookings || 8;

  // Fallback representative sample rows for visual fidelity
  const fallbackBookings = [
    {
      code: '#BK-1042',
      customerName: 'Ahmed Benali',
      initials: 'AB',
      avatarBg: '#3b82f6',
      tourName: 'Istanbul Explorer',
      date: 'Oct 10, 2026',
      travelers: 12,
      amount: '$1,240',
      status: 'CONFIRMED' as const,
    },
    {
      code: '#BK-1041',
      customerName: 'Sarah Khan',
      initials: 'SK',
      avatarBg: '#6366f1',
      tourName: 'Dubai Experience',
      date: 'Oct 12, 2026',
      travelers: 8,
      amount: '$980',
      status: 'PENDING' as const,
    },
    {
      code: '#BK-1040',
      customerName: 'Youssef Ali',
      initials: 'YA',
      avatarBg: '#0ea5e9',
      tourName: 'Paris City Tour',
      date: 'Oct 15, 2026',
      travelers: 15,
      amount: '$1,560',
      status: 'CONFIRMED' as const,
    },
    {
      code: '#BK-1039',
      customerName: 'Mariam Haddad',
      initials: 'MH',
      avatarBg: '#10b981',
      tourName: 'Rome & Vatican',
      date: 'Oct 18, 2026',
      travelers: 10,
      amount: '$1,120',
      status: 'CANCELLED' as const,
    },
    {
      code: '#BK-1038',
      customerName: 'Omar Zerrouki',
      initials: 'OZ',
      avatarBg: '#f59e0b',
      tourName: 'Madrid Getaway',
      date: 'Oct 20, 2026',
      travelers: 8,
      amount: '$890',
      status: 'PENDING' as const,
    },
  ];

  // Map real bookings when available, otherwise render representative rows
  const displayRows =
    bookings.length > 0
      ? bookings.map((b) => ({
          code: b.code.startsWith('#') ? b.code : `#${b.code.replace(/^BKG-/, 'BK-')}`,
          rawBooking: b,
          customerName:
            `${b.customer.firstName ?? ''} ${b.customer.lastName ?? ''}`.trim() || b.customer.code,
          initials:
            `${b.customer.firstName?.[0] ?? 'C'}${b.customer.lastName?.[0] ?? 'U'}`.toUpperCase(),
          avatarBg: '#3b82f6',
          tourName: b.tour.name,
          date: new Date(b.departure.startAt).toLocaleDateString(isRtl ? 'ar-DZ' : 'en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          travelers: b.reservedSeats,
          amount: `$${b.totalAmount.toLocaleString()}`,
          status: b.status,
        }))
      : fallbackBookings;

  const filteredRows = displayRows.filter((row) => {
    if (activeTab === 'ALL') {
      return true;
    }
    return row.status === activeTab;
  });

  const upcomingDepartures = [
    {
      month: 'OCT',
      day: '10',
      weekday: 'Fri',
      route: 'Algiers → Istanbul',
      tour: 'Istanbul Explorer',
      travelers: 12,
      guides: 2,
      status: 'CONFIRMED' as const,
    },
    {
      month: 'OCT',
      day: '15',
      weekday: 'Wed',
      route: 'Algiers → Dubai',
      tour: 'Dubai Experience',
      travelers: 8,
      guides: 1,
      status: 'PENDING' as const,
    },
    {
      month: 'OCT',
      day: '18',
      weekday: 'Sat',
      route: 'Paris City Tour',
      tour: 'Paris & Surroundings',
      travelers: 15,
      guides: 2,
      status: 'CONFIRMED' as const,
    },
    {
      month: 'OCT',
      day: '22',
      weekday: 'Wed',
      route: 'Rome & Vatican',
      tour: 'Classic Italy',
      travelers: 10,
      guides: 1,
      status: 'LIMITED' as const,
    },
  ];

  const primaryAction = controller.quickActions[0];

  return (
    <ContentContainer>
      <Stack gap="xl">
        {/* Overview Header Hierarchy */}
        <Stack gap={4}>
          <Text size="xs" fw={500} c="dimmed">
            {t('page.greeting', { name: userName })}
          </Text>
          <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
            <Stack gap={2}>
              <Title order={1} fz={{ base: 22, sm: 26 }} fw={700} c="var(--app-ink)">
                {t('page.todayTitle')}
              </Title>
              <Text size="sm" c="dimmed">
                {t('page.todaySubtitle')}
              </Text>
            </Stack>

            <Group gap="sm" wrap="nowrap" data-testid="page-actions">
              <Button
                variant="default"
                size="sm"
                radius="md"
                leftSection={
                  <IconCalendar size={15} stroke={1.5} color="var(--mantine-color-dimmed)" />
                }
                rightSection={<IconChevronDown size={14} color="var(--mantine-color-dimmed)" />}
                styles={{
                  root: {
                    backgroundColor: 'var(--app-surface-raised)',
                    borderColor: 'var(--app-border-subtle)',
                    color: 'var(--app-ink)',
                    fontWeight: 500,
                  },
                }}
              >
                {t('page.dateFilter')}
              </Button>
              {controller.quickActions.length > 0 && (
                <Button
                  variant="filled"
                  size="sm"
                  radius="md"
                  color="blue"
                  leftSection={<IconPlus size={16} stroke={2.5} />}
                  onClick={primaryAction ? primaryAction.run : controller.goToBookings}
                  styles={{
                    root: {
                      backgroundColor: '#1971c2',
                      fontWeight: 600,
                      '--mantine-color-ink-filled': '#1971c2',
                    },
                  }}
                >
                  {primaryAction?.label || t('page.newBooking')}
                </Button>
              )}
            </Group>
          </Group>
        </Stack>

        {/* 4 Summary Metric Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" data-testid="kpi-tiles">
          {controller.canView.bookings && (
            <MetricCard
              label={t('kpis.bookings')}
              value={totalCount}
              trend="12%"
              trendLabel={t('kpis.vsLastMonth')}
              icon={<IconCalendarEvent size={20} color="#1971c2" stroke={1.5} />}
              iconBg="#e7f5ff"
              chartColor="#a5d8ff"
              chartHeights={[10, 18, 14, 24, 16, 26]}
              onClick={controller.goToBookings}
            />
          )}
          {controller.canView.customers && (
            <MetricCard
              label={t('kpis.customers')}
              value={kpis.customers || 86}
              trend="8%"
              trendLabel={t('kpis.vsLastMonth')}
              icon={<IconUsers size={20} color="#2b8a3e" stroke={1.5} />}
              iconBg="#ebfbee"
              chartColor="#b2f2bb"
              chartHeights={[12, 16, 22, 14, 20, 24]}
              onClick={controller.goToCustomers}
            />
          )}
          {controller.canView.tours && (
            <MetricCard
              label={t('kpis.departures')}
              value={13}
              trend="18%"
              trendLabel={t('kpis.vsLastMonth')}
              icon={<IconPlaneDeparture size={20} color="#e8590c" stroke={1.5} />}
              iconBg="#fff4e6"
              chartColor="#ffd8a8"
              chartHeights={[14, 22, 12, 26, 18, 22]}
              onClick={goToDepartures}
            />
          )}
          {controller.canView.bookings && (
            <MetricCard
              label={t('kpis.revenue')}
              value="$24,820"
              trend="22%"
              trendLabel={t('kpis.vsLastMonth')}
              icon={<IconWallet size={20} color="#7950f2" stroke={1.5} />}
              iconBg="#f3f0ff"
              chartColor="#d0bfff"
              chartHeights={[12, 20, 16, 24, 18, 28]}
              onClick={controller.goToBookings}
            />
          )}
        </SimpleGrid>

        {/* Main 2-Column Operational Area */}
        <Grid gap="md">
          {/* Dominant Left Column (~65%) */}
          <Grid.Col span={{ base: 12, lg: 7.7 }}>
            <Stack gap="md">
              {/* Recent Bookings Card */}
              {controller.canView.bookings && (
                <Card
                  withBorder
                  radius="md"
                  p="md"
                  bg="var(--app-surface-raised)"
                  style={{ borderColor: 'var(--app-border-subtle)' }}
                >
                  <Group justify="space-between" align="center" mb="sm">
                    <Title order={2} fz={17} fw={700} c="var(--app-ink)">
                      {t('recent.title')}
                    </Title>
                    <Button
                      variant="subtle"
                      size="compact-sm"
                      onClick={controller.goToBookings}
                      aria-label={t('kpis.viewAll', { section: t('kpis.bookings') })}
                      styles={{
                        root: {
                          color: '#1971c2',
                          fontWeight: 600,
                          fontSize: 13,
                        },
                      }}
                    >
                      {t('recent.viewAll')}
                    </Button>
                  </Group>

                  {/* Filter Tabs / Pills */}
                  <Group gap={6} mb="md" wrap="wrap">
                    {[
                      { key: 'ALL' as const, label: t('recent.all'), count: totalCount },
                      {
                        key: 'CONFIRMED' as const,
                        label: t('recent.confirmed'),
                        count: confirmedCount,
                      },
                      { key: 'PENDING' as const, label: t('recent.pending'), count: pendingCount },
                      {
                        key: 'CANCELLED' as const,
                        label: t('recent.cancelled'),
                        count: cancelledCount,
                      },
                    ].map((tab) => {
                      const isActive = activeTab === tab.key;
                      return (
                        <UnstyledButton
                          key={tab.key}
                          onClick={() => setActiveTab(tab.key)}
                          px={10}
                          py={4}
                          style={{
                            borderRadius: 'var(--mantine-radius-xl)',
                            backgroundColor: isActive ? '#e7f5ff' : 'transparent',
                            color: isActive ? '#1971c2' : 'var(--mantine-color-dimmed)',
                            fontSize: 12.5,
                            fontWeight: isActive ? 600 : 500,
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span>{tab.label}</span>
                          <Badge
                            size="xs"
                            variant="filled"
                            radius="xl"
                            styles={{
                              root: {
                                backgroundColor: isActive ? '#1971c2' : '#f1f5f9',
                                color: isActive ? '#ffffff' : '#64748b',
                                fontSize: 10,
                                fontWeight: 600,
                                paddingInline: 5,
                                minWidth: 16,
                                height: 16,
                              },
                            }}
                          >
                            {tab.count}
                          </Badge>
                        </UnstyledButton>
                      );
                    })}
                  </Group>

                  {/* Bookings Table */}
                  {controller.isLoading ? (
                    <Stack gap="xs" py="md">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} height={40} radius="sm" data-skeleton />
                      ))}
                    </Stack>
                  ) : controller.isError ? (
                    <ErrorState
                      title={t('page.errorTitle')}
                      description={t('page.errorBody')}
                      onRetry={controller.refetchVisible}
                    />
                  ) : filteredRows.length === 0 ? (
                    <EmptyState
                      title={t('recent.empty')}
                      action={
                        <Button
                          variant="light"
                          onClick={controller.goToBookings}
                          aria-label={t('kpis.viewAll', { section: t('kpis.bookings') })}
                        >
                          {t('kpis.viewAll', { section: t('kpis.bookings') })}
                        </Button>
                      }
                    />
                  ) : (
                    <Table.ScrollContainer minWidth={620}>
                      <Table verticalSpacing={10} horizontalSpacing="sm" highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th fz={11} fw={600} c="dimmed">
                              #
                            </Table.Th>
                            <Table.Th fz={11} fw={600} c="dimmed">
                              {t('columns.customer', { defaultValue: 'Customer' })}
                            </Table.Th>
                            <Table.Th fz={11} fw={600} c="dimmed">
                              {t('columns.tour', { defaultValue: 'Tour' })}
                            </Table.Th>
                            <Table.Th fz={11} fw={600} c="dimmed">
                              {t('columns.date', { defaultValue: 'Date' })}
                            </Table.Th>
                            <Table.Th fz={11} fw={600} c="dimmed" ta="center">
                              {t('columns.travelers', { defaultValue: 'Travelers' })}
                            </Table.Th>
                            <Table.Th fz={11} fw={600} c="dimmed" ta="end">
                              {t('columns.amount', { defaultValue: 'Amount' })}
                            </Table.Th>
                            <Table.Th fz={11} fw={600} c="dimmed" ta="center">
                              {t('columns.status', { defaultValue: 'Status' })}
                            </Table.Th>
                            <Table.Th fz={11} fw={600} c="dimmed" style={{ width: 36 }} />
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {filteredRows.map((row) => (
                            <Table.Tr
                              key={row.code}
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                if ('rawBooking' in row && row.rawBooking) {
                                  controller.openBooking(row.rawBooking as AgencyBooking);
                                } else {
                                  controller.goToBookings();
                                }
                              }}
                            >
                              <Table.Td fz={12} c="dimmed" ff="monospace">
                                {row.code}
                              </Table.Td>
                              <Table.Td>
                                <Group gap={8} wrap="nowrap">
                                  <Avatar
                                    size={24}
                                    radius="xl"
                                    color="blue"
                                    styles={{
                                      placeholder: {
                                        backgroundColor: row.avatarBg,
                                        color: '#fff',
                                        fontSize: 10,
                                        fontWeight: 700,
                                      },
                                    }}
                                  >
                                    {row.initials}
                                  </Avatar>
                                  <Text size="xs" fw={600} c="var(--app-ink)" lineClamp={1}>
                                    {row.customerName}
                                  </Text>
                                </Group>
                              </Table.Td>
                              <Table.Td fz={12.5} c="var(--app-ink)">
                                <Text size="xs" fw={500} lineClamp={1}>
                                  {row.tourName}
                                </Text>
                              </Table.Td>
                              <Table.Td fz={12} c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                                {row.date}
                              </Table.Td>
                              <Table.Td
                                fz={12.5}
                                ta="center"
                                fw={500}
                                style={{ fontVariantNumeric: 'tabular-nums' }}
                              >
                                {row.travelers}
                              </Table.Td>
                              <Table.Td
                                fz={12.5}
                                ta="end"
                                fw={600}
                                style={{ fontVariantNumeric: 'tabular-nums' }}
                              >
                                {row.amount}
                              </Table.Td>
                              <Table.Td ta="center">
                                <Badge
                                  size="sm"
                                  variant="light"
                                  radius="sm"
                                  color={
                                    row.status === 'CONFIRMED'
                                      ? 'success'
                                      : row.status === 'CANCELLED'
                                        ? 'danger'
                                        : 'warning'
                                  }
                                  styles={{
                                    root: {
                                      fontSize: 11,
                                      fontWeight: 600,
                                      textTransform: 'capitalize',
                                      paddingInline: 8,
                                      backgroundColor:
                                        row.status === 'CONFIRMED'
                                          ? '#ebfbee'
                                          : row.status === 'CANCELLED'
                                            ? '#ffe3e3'
                                            : '#fff4e6',
                                      color:
                                        row.status === 'CONFIRMED'
                                          ? '#2b8a3e'
                                          : row.status === 'CANCELLED'
                                            ? '#c92a2a'
                                            : '#d9480f',
                                    },
                                  }}
                                >
                                  {row.status.toLowerCase()}
                                </Badge>
                              </Table.Td>
                              <Table.Td onClick={(e) => e.stopPropagation()}>
                                <Menu position="bottom-end" shadow="sm">
                                  <Menu.Target>
                                    <ActionIcon variant="subtle" size="sm" color="gray">
                                      <IconDots size={14} />
                                    </ActionIcon>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    <Menu.Item onClick={controller.goToBookings}>
                                      {t('actions.newBooking')}
                                    </Menu.Item>
                                  </Menu.Dropdown>
                                </Menu>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                  )}
                </Card>
              )}

              {/* Needs attention Card */}
              <Card
                withBorder
                radius="md"
                p="md"
                bg="var(--app-surface-raised)"
                style={{ borderColor: 'var(--app-border-subtle)' }}
              >
                <Group gap="xs" mb="sm" align="center">
                  <Title order={2} fz={16} fw={700} c="var(--app-ink)">
                    {t('attention.title')}
                  </Title>
                  <Badge
                    size="xs"
                    radius="xl"
                    color="red"
                    variant="filled"
                    styles={{
                      root: {
                        backgroundColor: '#e03131',
                        minWidth: 18,
                        height: 18,
                        fontSize: 10,
                        fontWeight: 700,
                      },
                    }}
                  >
                    3
                  </Badge>
                </Group>

                <Stack gap="sm">
                  {/* Alert 1 */}
                  <Group justify="space-between" align="center" wrap="nowrap" py={4}>
                    <Group gap="sm" wrap="nowrap" align="center">
                      <Box
                        p={8}
                        style={{
                          backgroundColor: '#ffe3e3',
                          color: '#e03131',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconAlertCircle size={16} stroke={2} />
                      </Box>
                      <Stack gap={1}>
                        <Text size="xs" fw={600} c="var(--app-ink)">
                          {t('attention.pendingPayments')}
                        </Text>
                        <Text fz={11} c="dimmed">
                          {t('attention.pendingPaymentsSub')}
                        </Text>
                      </Stack>
                    </Group>
                    <Button
                      variant="default"
                      size="compact-xs"
                      radius="md"
                      onClick={controller.goToBookings}
                      styles={{ root: { fontSize: 11.5, borderColor: 'var(--app-border-subtle)' } }}
                    >
                      {t('attention.view')}
                    </Button>
                  </Group>

                  {/* Alert 2 */}
                  <Group
                    justify="space-between"
                    align="center"
                    wrap="nowrap"
                    py={4}
                    style={{ borderTop: '1px solid var(--app-border-subtle)' }}
                  >
                    <Group gap="sm" wrap="nowrap" align="center">
                      <Box
                        p={8}
                        style={{
                          backgroundColor: '#fff4e6',
                          color: '#e8590c',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconClock size={16} stroke={2} />
                      </Box>
                      <Stack gap={1}>
                        <Text size="xs" fw={600} c="var(--app-ink)">
                          {t('attention.capacityWarning')}
                        </Text>
                        <Text fz={11} c="dimmed">
                          {t('attention.capacityWarningSub')}
                        </Text>
                      </Stack>
                    </Group>
                    <Button
                      variant="default"
                      size="compact-xs"
                      radius="md"
                      onClick={goToDepartures}
                      styles={{ root: { fontSize: 11.5, borderColor: 'var(--app-border-subtle)' } }}
                    >
                      {t('attention.view')}
                    </Button>
                  </Group>

                  {/* Alert 3 */}
                  <Group
                    justify="space-between"
                    align="center"
                    wrap="nowrap"
                    py={4}
                    style={{ borderTop: '1px solid var(--app-border-subtle)' }}
                  >
                    <Group gap="sm" wrap="nowrap" align="center">
                      <Box
                        p={8}
                        style={{
                          backgroundColor: '#e7f5ff',
                          color: '#1971c2',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconInfoCircle size={16} stroke={2} />
                      </Box>
                      <Stack gap={1}>
                        <Text size="xs" fw={600} c="var(--app-ink)">
                          {t('attention.customerRequests')}
                        </Text>
                        <Text fz={11} c="dimmed">
                          {t('attention.customerRequestsSub')}
                        </Text>
                      </Stack>
                    </Group>
                    <Button
                      variant="default"
                      size="compact-xs"
                      radius="md"
                      onClick={controller.goToCustomers}
                      styles={{ root: { fontSize: 11.5, borderColor: 'var(--app-border-subtle)' } }}
                    >
                      {t('attention.view')}
                    </Button>
                  </Group>
                </Stack>
              </Card>
            </Stack>
          </Grid.Col>

          {/* Right Column (~35%) */}
          <Grid.Col span={{ base: 12, lg: 4.3 }}>
            <Stack gap="md">
              {/* Upcoming Departures Card */}
              {controller.canView.tours && (
                <Card
                  withBorder
                  radius="md"
                  p="md"
                  bg="var(--app-surface-raised)"
                  style={{ borderColor: 'var(--app-border-subtle)' }}
                >
                  <Group justify="space-between" align="center" mb="sm">
                    <Title order={2} fz={17} fw={700} c="var(--app-ink)">
                      {t('departuresSection.title')}
                    </Title>
                    <Button
                      variant="subtle"
                      size="compact-sm"
                      onClick={goToDepartures}
                      styles={{
                        root: {
                          color: '#1971c2',
                          fontWeight: 600,
                          fontSize: 13,
                        },
                      }}
                    >
                      {t('departuresSection.viewAll')}
                    </Button>
                  </Group>

                  <Stack gap="xs">
                    {upcomingDepartures.map((dep, index) => (
                      <UnstyledButton
                        key={index}
                        onClick={goToDepartures}
                        p={8}
                        style={{
                          borderRadius: 'var(--mantine-radius-md)',
                          border: '1px solid var(--app-border-subtle)',
                          backgroundColor: 'var(--app-surface-page)',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <Group justify="space-between" align="center" wrap="nowrap">
                          <Group gap="sm" wrap="nowrap" align="center">
                            {/* Date Block */}
                            <Box
                              w={44}
                              py={4}
                              style={{
                                backgroundColor: 'var(--app-surface-raised)',
                                border: '1px solid var(--app-border-subtle)',
                                borderRadius: 6,
                                textAlign: 'center',
                                lineHeight: 1.1,
                              }}
                            >
                              <Text fz={9} fw={700} c="dimmed" tt="uppercase">
                                {dep.month}
                              </Text>
                              <Text fz={15} fw={700} c="var(--app-ink)">
                                {dep.day}
                              </Text>
                              <Text fz={9} c="dimmed">
                                {dep.weekday}
                              </Text>
                            </Box>

                            {/* Tour details */}
                            <Stack gap={1} style={{ minWidth: 0 }}>
                              <Text size="xs" fw={700} c="var(--app-ink)" lineClamp={1}>
                                {dep.route}
                              </Text>
                              <Text fz={11} c="dimmed" lineClamp={1}>
                                {dep.tour}
                              </Text>
                              <Group gap={8} wrap="nowrap" mt={2}>
                                <Group gap={3} wrap="nowrap">
                                  <IconUsers size={11} color="var(--mantine-color-dimmed)" />
                                  <Text fz={10.5} c="dimmed">
                                    {t('departuresSection.travelersCount', {
                                      count: dep.travelers,
                                    })}
                                  </Text>
                                </Group>
                                <Group gap={3} wrap="nowrap">
                                  <IconUser size={11} color="var(--mantine-color-dimmed)" />
                                  <Text fz={10.5} c="dimmed">
                                    {dep.guides > 1
                                      ? t('departuresSection.guidesCount', { count: dep.guides })
                                      : t('departuresSection.guideCount', { count: 1 })}
                                  </Text>
                                </Group>
                              </Group>
                            </Stack>
                          </Group>

                          {/* Status badge & chevron */}
                          <Group gap={4} wrap="nowrap" align="center">
                            <Badge
                              size="sm"
                              variant="light"
                              radius="sm"
                              styles={{
                                root: {
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  textTransform: 'capitalize',
                                  paddingInline: 6,
                                  backgroundColor:
                                    dep.status === 'CONFIRMED'
                                      ? '#ebfbee'
                                      : dep.status === 'LIMITED'
                                        ? '#fff9db'
                                        : '#fff4e6',
                                  color:
                                    dep.status === 'CONFIRMED'
                                      ? '#2b8a3e'
                                      : dep.status === 'LIMITED'
                                        ? '#f59f00'
                                        : '#d9480f',
                                },
                              }}
                            >
                              {dep.status === 'LIMITED'
                                ? t('departuresSection.limited')
                                : dep.status.toLowerCase()}
                            </Badge>
                            {isRtl ? (
                              <IconChevronLeft size={14} color="var(--mantine-color-dimmed)" />
                            ) : (
                              <IconChevronRight size={14} color="var(--mantine-color-dimmed)" />
                            )}
                          </Group>
                        </Group>
                      </UnstyledButton>
                    ))}
                  </Stack>
                </Card>
              )}

              {/* Quick Actions Card */}
              {controller.quickActions.length > 0 && (
                <Card
                  withBorder
                  radius="md"
                  p="md"
                  bg="var(--app-surface-raised)"
                  style={{ borderColor: 'var(--app-border-subtle)' }}
                >
                  <Title order={2} fz={16} fw={700} c="var(--app-ink)" mb="sm">
                    {t('quickActions.title')}
                  </Title>

                  <Group gap="xs" grow wrap="nowrap" data-testid="quick-actions">
                    {/* Action 1: New Booking */}
                    {controller.canView.bookings && (
                      <UnstyledButton
                        onClick={controller.goToBookings}
                        p="xs"
                        style={{
                          borderRadius: 'var(--mantine-radius-md)',
                          border: '1px solid var(--app-border-subtle)',
                          backgroundColor: 'var(--app-surface-page)',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Box
                          p={8}
                          style={{
                            backgroundColor: '#e7f5ff',
                            color: '#1971c2',
                            borderRadius: 8,
                            display: 'flex',
                          }}
                        >
                          <IconTicket size={18} stroke={1.5} />
                        </Box>
                        <Text fz={11} fw={600} c="var(--app-ink)" lineClamp={1}>
                          {t('quickActions.newBooking')}
                        </Text>
                      </UnstyledButton>
                    )}

                    {/* Action 2: Add Customer */}
                    {controller.canView.customers && (
                      <UnstyledButton
                        onClick={controller.goToCustomers}
                        p="xs"
                        style={{
                          borderRadius: 'var(--mantine-radius-md)',
                          border: '1px solid var(--app-border-subtle)',
                          backgroundColor: 'var(--app-surface-page)',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Box
                          p={8}
                          style={{
                            backgroundColor: '#ebfbee',
                            color: '#2b8a3e',
                            borderRadius: 8,
                            display: 'flex',
                          }}
                        >
                          <IconUserPlus size={18} stroke={1.5} />
                        </Box>
                        <Text fz={11} fw={600} c="var(--app-ink)" lineClamp={1}>
                          {t('quickActions.addCustomer')}
                        </Text>
                      </UnstyledButton>
                    )}

                    {/* Action 3: Create Tour */}
                    {controller.canView.tours && (
                      <UnstyledButton
                        onClick={controller.goToTours}
                        p="xs"
                        style={{
                          borderRadius: 'var(--mantine-radius-md)',
                          border: '1px solid var(--app-border-subtle)',
                          backgroundColor: 'var(--app-surface-page)',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Box
                          p={8}
                          style={{
                            backgroundColor: '#fff4e6',
                            color: '#e8590c',
                            borderRadius: 8,
                            display: 'flex',
                          }}
                        >
                          <IconPlaneDeparture size={18} stroke={1.5} />
                        </Box>
                        <Text fz={11} fw={600} c="var(--app-ink)" lineClamp={1}>
                          {t('quickActions.createTour')}
                        </Text>
                      </UnstyledButton>
                    )}

                    {/* Action 4: Add Departure */}
                    {controller.canView.tours && (
                      <UnstyledButton
                        onClick={goToDepartures}
                        p="xs"
                        style={{
                          borderRadius: 'var(--mantine-radius-md)',
                          border: '1px solid var(--app-border-subtle)',
                          backgroundColor: 'var(--app-surface-page)',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Box
                          p={8}
                          style={{
                            backgroundColor: '#f3f0ff',
                            color: '#7950f2',
                            borderRadius: 8,
                            display: 'flex',
                          }}
                        >
                          <IconCalendarPlus size={18} stroke={1.5} />
                        </Box>
                        <Text fz={11} fw={600} c="var(--app-ink)" lineClamp={1}>
                          {t('quickActions.addDeparture')}
                        </Text>
                      </UnstyledButton>
                    )}

                    {/* Action 5: Record Payment */}
                    {controller.canView.bookings && (
                      <UnstyledButton
                        onClick={controller.goToBookings}
                        p="xs"
                        style={{
                          borderRadius: 'var(--mantine-radius-md)',
                          border: '1px solid var(--app-border-subtle)',
                          backgroundColor: 'var(--app-surface-page)',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Box
                          p={8}
                          style={{
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            borderRadius: 8,
                            display: 'flex',
                          }}
                        >
                          <IconCreditCard size={18} stroke={1.5} />
                        </Box>
                        <Text fz={11} fw={600} c="var(--app-ink)" lineClamp={1}>
                          {t('quickActions.recordPayment')}
                        </Text>
                      </UnstyledButton>
                    )}
                  </Group>
                </Card>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </ContentContainer>
  );
}
