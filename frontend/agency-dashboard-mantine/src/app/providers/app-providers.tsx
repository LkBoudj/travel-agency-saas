import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

import 'dayjs/locale/ar-dz';
import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useTranslation } from 'react-i18next';
import { MantineProvider } from '@mantine/core';
import { DatesProvider, type DatesProviderSettings } from '@mantine/dates';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { useAppLocale } from '../../i18n/hooks/use-app-locale.ts';
import { useIsRtl } from '../../i18n/hooks/use-is-rtl.ts';
import type { AppLocale } from '../../i18n/index.ts';
import { cssVariablesResolver, theme } from '../../theme/theme.ts';
import { buildQueryClient } from './query-client.ts';
import '../../theme/tokens.css';

const DATE_SETTINGS: Record<AppLocale, DatesProviderSettings> = {
  en: { locale: 'en', firstDayOfWeek: 0, weekendDays: [0, 6] },
  ar: { locale: 'ar-dz', firstDayOfWeek: 1, weekendDays: [0, 6] },
};

/**
 * The application shell's provider stack, outermost first.
 *
 * Query client → Mantine → dates → modals → notifications. Mantine's CSS is
 * imported for side effects above the tree so it lands before any rendered
 * component; `theme` itself stays a pure token/config module.
 */
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
            modalProps={{ centered: true, removeScrollProps: { removeScrollBar: false } }}
          >
            <Notifications position={isRtl ? 'bottom-left' : 'bottom-right'} limit={4} />
            {children}
          </ModalsProvider>
        </DatesProvider>
      </MantineProvider>
      {/* Dev-only: the launcher must never ship in a production bundle. */}
      {import.meta.env.DEV ? <ReactQueryDevtools buttonPosition="bottom-right" /> : null}
    </QueryClientProvider>
  );
}
