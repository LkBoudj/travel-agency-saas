// app-allow-raw-hex: branding and sidebar dark theme accents
import { IconPlane } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Box, Group, NavLink, ScrollArea, Stack, Text, ThemeIcon } from '@mantine/core';
import { useBottomNavItems, useNavItems } from './hooks/use-nav-items.ts';

function BrandPaperPlaneIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M21 3L14.5 21a.55.55 0 0 1-1 0L10 14l-7-3.5a.55.55 0 0 1 0-1L21 3z" fill="#3b82f6" />
      <path d="M10 14L21 3" stroke="rgba(0, 0, 0, 0.2)" strokeWidth="1.4" />
    </svg>
  );
}

export function DashboardSidebar({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const navItems = useNavItems();
  const bottomItems = useBottomNavItems();

  const renderLink = (item: {
    labelKey: string;
    to: string;
    icon: React.ComponentType<{ size: number }>;
  }) => {
    const Icon = item.icon;
    const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`);
    return (
      <NavLink
        key={item.labelKey}
        component={Link}
        to={item.to}
        label={t(item.labelKey)}
        leftSection={<Icon size={18} />}
        active={isActive}
        onClick={onNavigate}
        fw={isActive ? 600 : 400}
        styles={{
          root: {
            borderRadius: 'var(--mantine-radius-md)',
            padding: '8px 12px',
            backgroundColor: isActive ? 'var(--app-nav-active)' : 'transparent',
            '&:hover': {
              backgroundColor: isActive ? 'var(--app-nav-active)' : 'var(--app-nav-hover)',
            },
          },
          label: {
            color: isActive ? 'var(--app-nav-text-active)' : '#cbd5e1',
            fontSize: '13.5px',
          },
          section: {
            color: isActive ? 'var(--app-nav-text-active)' : 'var(--app-nav-text-muted)',
            marginInlineEnd: 10,
          },
        }}
      />
    );
  };

  return (
    <Stack h="100%" justify="space-between" gap="sm" style={{ minHeight: 0 }}>
      {/* Top Branding */}
      <Box px="xs" pt="xs" pb="sm">
        <Group gap={10} align="center" wrap="nowrap">
          <BrandPaperPlaneIcon />
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Text fw={700} fz={15} c="#ffffff" lh={1.2}>
              {t('shell.brandTitle')}
            </Text>
            <Text fz={11} c="var(--app-nav-text-muted)" lh={1.2}>
              {t('shell.brandSubtitle')}
            </Text>
          </Stack>
        </Group>
      </Box>

      {/* Main Navigation links */}
      <ScrollArea.Autosize
        component="nav"
        aria-label={t('shell.mainNav')}
        flex={1}
        style={{ minHeight: 0 }}
      >
        <Stack gap={3}>{navItems.map(renderLink)}</Stack>
      </ScrollArea.Autosize>

      {/* Bottom Section: Settings & Help + Agency Card */}
      <Stack gap="xs" pt="xs" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Stack gap={2}>{bottomItems.map(renderLink)}</Stack>

        {/* Agency Bottom Card */}
        <Box
          p="xs"
          style={{
            borderRadius: 'var(--mantine-radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Group gap="xs" wrap="nowrap" align="center">
            <ThemeIcon
              size={28}
              radius="xl"
              color="blue"
              variant="light"
              bg="rgba(59, 130, 246, 0.2)"
            >
              <IconPlane size={15} color="#60a5fa" />
            </ThemeIcon>
            <Stack gap={1} style={{ minWidth: 0 }}>
              <Text size="xs" fw={600} c="#ffffff" lineClamp={1}>
                {t('shell.yourAgency')}
              </Text>
              <Text fz={10} c="var(--app-nav-text-muted)" lineClamp={1}>
                {t('shell.yourAgencySubtitle')}
              </Text>
            </Stack>
          </Group>
        </Box>
      </Stack>
    </Stack>
  );
}
