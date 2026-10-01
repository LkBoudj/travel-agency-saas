import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

import 'dayjs/locale/ar-dz';
import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useTranslation } from 'react-i18next';
import { MantineProvider } from '@mantine/core';
import { DatesProvider, type DatesProviderSettings } from '@mantine/dates';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import type { AppLocale } from '../i18n';
import { useAppLocale } from '../i18n/hooks/use-app-locale';
import { useIsRtl } from '../i18n/hooks/use-is-rtl';
import { ApiError } from '../services/api';
import { cssVariablesResolver, theme } from './theme';
import './tokens.css';

const DATE_SETTINGS: Record<AppLocale, DatesProviderSettings> = {
  en: { locale: 'en', firstDayOfWeek: 0, weekendDays: [0, 6] },
  ar: { locale: 'ar-dz', firstDayOfWeek: 1, weekendDays: [0, 6] },
};

export function buildQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(buildQueryClient);
  const locale = useAppLocale();
  const isRtl = useIsRtl();
  const { t } = useTranslation('common');

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider
        theme={theme}
        defaultColorScheme="light"
        cssVariablesResolver={cssVariablesResolver}
      >
        <DatesProvider settings={DATE_SETTINGS[locale]}>
          <ModalsProvider
            labels={{ confirm: t('actions.confirm'), cancel: t('actions.cancel') }}
            modalProps={{ centered: true }}
          >
            <Notifications position={isRtl ? 'bottom-left' : 'bottom-right'} limit={4} />
            {children}
          </ModalsProvider>
        </DatesProvider>
      </MantineProvider>
      {/* Dev-only: the launcher must never ship in a production bundle. */}
      {import.meta.env.DEV ? <ReactQueryDevtools buttonPosition="bottom-left" /> : null}
    </QueryClientProvider>
  );
}
