import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { NavLink, ScrollArea, Stack, Text } from '@mantine/core';
import { useNavGroups } from './hooks/use-nav-items.ts';

export function DashboardSidebar({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const groups = useNavGroups();

  return (
    <ScrollArea.Autosize component="nav" aria-label={t('shell.mainNav')} h="100%">
      <Stack gap="lg">
        {groups.map((group) => (
          <Stack key={group.labelKey} gap={2} role="group" aria-label={t(group.labelKey)}>
            <Text size="xs" fw={600} c="var(--app-nav-text-muted)" tt="uppercase" px="xs" pb={4}>
              {t(group.labelKey)}
            </Text>
            {group.items.map((item) => {
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
                  fw={isActive ? 500 : 400}
                  // The rail is dark, so the active item is identified by its fill
                  // plus a brighter label — not by Mantine's own active colour,
                  // which is derived from the (now near-black) primary palette and
                  // would therefore be dark-on-dark.
                  styles={{
                    root: {
                      borderRadius: 'var(--mantine-radius-md)',
                      '--nl-bg': 'var(--app-nav-active)',
                      '--nl-hover': 'var(--app-nav-hover)',
                    },
                    label: {
                      color: isActive ? 'var(--app-nav-text-active)' : 'var(--app-nav-text)',
                    },
                    section: {
                      color: isActive ? 'var(--app-nav-text-active)' : 'var(--app-nav-text-muted)',
                    },
                  }}
                />
              );
            })}
          </Stack>
        ))}
      </Stack>
    </ScrollArea.Autosize>
  );
}
