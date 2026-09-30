import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { NavLink, ScrollArea, Stack, Text } from '@mantine/core';
import { useNavItems } from './hooks/use-nav-items.ts';

export function DashboardSidebar({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const items = useNavItems();

  return (
    <Stack gap={4} h="100%" justify="space-between">
      <ScrollArea.Autosize>
        <Stack gap={2}>
          <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="sm" py="xs">
            {t('brand')}
          </Text>
          {items.map((item) => {
            const Icon = item.icon;
            // Prefix match, not equality: a detail route such as
            // `/bookings/BKG-…` or `/trips/TUR-…` must keep its parent section
            // highlighted, otherwise no nav item reads as active at all.
            const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <NavLink
                key={item.to}
                component={Link}
                to={item.to}
                label={t(item.labelKey)}
                leftSection={<Icon size={16} />}
                active={isActive}
                onClick={onNavigate}
                style={{
                  borderRadius: 'var(--mantine-radius-md)',
                  '--nl-bg': 'color-mix(in srgb, var(--mantine-color-brand-5) 18%, transparent)',
                  '--nl-hover': 'color-mix(in srgb, var(--mantine-color-brand-5) 26%, transparent)',
                  '--nl-color': 'var(--mantine-color-brand-0)',
                }}
              />
            );
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
