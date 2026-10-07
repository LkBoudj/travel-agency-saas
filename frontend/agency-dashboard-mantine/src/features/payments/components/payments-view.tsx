import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  Grid,
  Group,
  Paper,
  ScrollArea,
  Skeleton,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { ContentContainer } from '../../../components/content-container.tsx';
import { EmptyState, ErrorState } from '../../../components/empty-state.tsx';
import { PageHeader } from '../../../components/page-header.tsx';
import { Panel } from '../../../components/panel.tsx';
import { SearchInput } from '../../../components/search-input.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import { useAppLocale } from '../../../i18n/hooks/use-app-locale.ts';
import { getIntlLocale } from '../../../i18n/locales.ts';
import { bookingCustomerName } from '../../bookings/lib/booking-display.ts';
import type { PaymentsPageController } from '../hooks/use-payments-page.ts';
import { formatPaymentAmount } from '../lib/payment-payloads.ts';
import { PaymentHistoryTable } from './payment-history-table.tsx';
import { PaymentLedgerSummary } from './payment-ledger-summary.tsx';

export function PaymentsView(controller: PaymentsPageController) {
  const { t } = useTranslation('payments');
  const locale = getIntlLocale(useAppLocale());

  const canRecordAction =
    controller.canRecordPayment &&
    controller.selectedBooking !== null &&
    controller.selectedBooking.status !== 'CANCELLED';

  return (
    <ContentContainer>
      <Stack gap="lg">
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
          actions={
            canRecordAction ? (
              <Button
                color="blue"
                leftSection={<IconPlus size={16} />}
                onClick={controller.openRecord}
                styles={{
                  root: {
                    backgroundColor: 'var(--app-action-primary)',
                    fontWeight: 600,
                  },
                }}
              >
                {t('recordPaymentButton')}
              </Button>
            ) : null
          }
        />

        <Grid align="flex-start">
          {/* Left: Bookings list & search */}
          <Grid.Col span={{ base: 12, md: 4, lg: 4 }}>
            <Panel p="sm">
              <Stack gap="sm">
                <SearchInput
                  value={controller.search.raw}
                  onChange={controller.search.setRaw}
                  placeholder={t('searchBookingPlaceholder')}
                />

                {controller.isBookingsLoading ? (
                  <Stack gap="xs" py="xs">
                    <Skeleton height={60} radius="sm" />
                    <Skeleton height={60} radius="sm" />
                    <Skeleton height={60} radius="sm" />
                  </Stack>
                ) : controller.isBookingsError ? (
                  <ErrorState
                    title={t('selectBookingPrompt')}
                    onRetry={controller.refetchBookings}
                  />
                ) : controller.bookings.length === 0 ? (
                  <Text size="sm" c="dimmed" ta="center" py="lg">
                    {t('noBookingsFound')}
                  </Text>
                ) : (
                  <ScrollArea.Autosize mah={600} type="auto">
                    <Stack gap="xs" pr={4}>
                      {controller.bookings.map((booking) => {
                        const isSelected = booking.code === controller.selectedBookingCode;
                        return (
                          <UnstyledButton
                            key={booking.code}
                            onClick={() => controller.selectBooking(booking.code)}
                            style={{
                              display: 'block',
                              width: '100%',
                              borderRadius: 'var(--mantine-radius-sm)',
                              padding: '10px 12px',
                              backgroundColor: isSelected
                                ? 'var(--mantine-color-blue-light)'
                                : 'transparent',
                              border: isSelected
                                ? '1px solid var(--mantine-color-blue-light-hover)'
                                : '1px solid transparent',
                              transition: 'background-color 150ms ease',
                            }}
                          >
                            <Group justify="space-between" align="center" wrap="nowrap" mb={4}>
                              <Text size="sm" ff="monospace" fw={600}>
                                {booking.code}
                              </Text>
                              <StatusBadge status={booking.status} />
                            </Group>

                            <Text size="xs" fw={500} lineClamp={1}>
                              {bookingCustomerName(booking.customer)}
                            </Text>

                            <Group justify="space-between" align="center" mt={4}>
                              <Text size="xs" c="dimmed" lineClamp={1}>
                                {booking.tour.name}
                              </Text>
                              <Text size="xs" fw={600}>
                                {formatPaymentAmount(booking.totalAmount, booking.currency, locale)}
                              </Text>
                            </Group>
                          </UnstyledButton>
                        );
                      })}
                    </Stack>
                  </ScrollArea.Autosize>
                )}
              </Stack>
            </Panel>
          </Grid.Col>

          {/* Right: Payment Ledger & History */}
          <Grid.Col span={{ base: 12, md: 8, lg: 8 }}>
            {controller.isBookingsLoading ? (
              <Stack gap="md">
                <Skeleton height={68} radius="sm" />
                <Skeleton height={140} radius="md" />
                <Skeleton height={200} radius="md" />
              </Stack>
            ) : !controller.selectedBookingCode ? (
              <Panel>
                <EmptyState
                  title={t('selectBookingPrompt')}
                  description={t('selectBookingPrompt')}
                />
              </Panel>
            ) : (
              <Stack gap="md">
                {/* Active Booking Header */}
                {controller.selectedBooking ? (
                  <Paper withBorder p="md" radius="sm">
                    <Group justify="space-between" align="center" wrap="wrap">
                      <Stack gap={2}>
                        <Group gap="xs" align="center">
                          <Text size="sm" c="dimmed">
                            {t('selectBookingLabel')}:
                          </Text>
                          <Text size="sm" ff="monospace" fw={700}>
                            {controller.selectedBooking.code}
                          </Text>
                          <StatusBadge status={controller.selectedBooking.status} />
                        </Group>
                        <Text size="xs" c="dimmed">
                          {bookingCustomerName(controller.selectedBooking.customer)} ·{' '}
                          {controller.selectedBooking.tour.name}
                        </Text>
                      </Stack>

                      {controller.selectedBooking.status === 'CANCELLED' ? (
                        <Badge color="red" variant="light">
                          {t('common:statuses.cancelled', 'Cancelled')}
                        </Badge>
                      ) : null}
                    </Group>
                  </Paper>
                ) : null}

                {/* Ledger States */}
                {controller.isLedgerLoading ||
                !controller.ledger ||
                controller.ledger.bookingCode !== controller.selectedBookingCode ? (
                  <Stack gap="md">
                    <Skeleton height={120} radius="sm" />
                    <Skeleton height={200} radius="sm" />
                  </Stack>
                ) : controller.isLedgerError ? (
                  <ErrorState title={t('history.empty')} onRetry={controller.refetchLedger} />
                ) : (
                  <>
                    <PaymentLedgerSummary ledger={controller.ledger} />

                    <Panel>
                      <Group justify="space-between" align="center" mb="sm">
                        <Title order={3} fz="sm" fw={600} c="dimmed" tt="uppercase">
                          {t('history.title')}
                        </Title>
                        <Text size="xs" c="dimmed">
                          {controller.ledger.payments.length} {t('history.title').toLowerCase()}
                        </Text>
                      </Group>

                      <PaymentHistoryTable
                        payments={controller.ledger.payments}
                        currency={controller.ledger.currency}
                      />
                    </Panel>
                  </>
                )}
              </Stack>
            )}
          </Grid.Col>
        </Grid>
      </Stack>
    </ContentContainer>
  );
}
