// app-allow-raw-hex: branding and sidebar dark theme accents
import { IconSparkles } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Box, Group, NavLink, ScrollArea, Stack, Text } from '@mantine/core';
import { useBottomNavItems, useNavItems } from './hooks/use-nav-items.ts';

function BrandPaperPlaneIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M22 2L11 13"
        stroke="#38bdf8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        fill="#2563eb"
        stroke="#38bdf8"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardSidebar({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const navItems = useNavItems();
  const bottomItems = useBottomNavItems();

  const renderItem = (item: {
    labelKey: string;
    to: string;
    icon: React.ComponentType<{ size: number }>;
    children?: { labelKey: string; to: string }[];
  }) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExactOrChild = pathname === item.to || pathname.startsWith(`${item.to}/`);
    const isAnyChildActive =
      hasChildren &&
      item.children?.some((c) => pathname === c.to || pathname.startsWith(`${c.to}/`));
    const isSectionActive = isExactOrChild || isAnyChildActive;

    if (hasChildren) {
      return (
        <Box key={item.labelKey}>
          <NavLink
            label={t(item.labelKey)}
            leftSection={<Icon size={18} />}
            defaultOpened={isSectionActive}
            childrenOffset={0}
            fw={500}
            styles={{
              root: {
                borderRadius: 'var(--mantine-radius-md)',
                padding: '8px 12px',
                backgroundColor: isSectionActive ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'var(--app-nav-hover)',
                },
              },
              label: {
                color: isSectionActive ? '#ffffff' : '#cbd5e1',
                fontSize: '13.5px',
              },
              section: {
                color: isSectionActive ? '#60a5fa' : 'var(--app-nav-text-muted)',
                marginInlineEnd: 10,
              },
              chevron: {
                color: 'var(--app-nav-text-muted)',
              },
            }}
          >
            {/* Tree connector line */}
            <Box
              style={{
                marginInlineStart: 21,
                borderInlineStart: '1px solid rgba(255, 255, 255, 0.12)',
                paddingInlineStart: 8,
                paddingTop: 2,
                paddingBottom: 2,
              }}
            >
              {item.children?.map((child) => {
                const isChildActive = pathname === child.to || pathname.startsWith(`${child.to}/`);
                return (
                  <NavLink
                    key={child.labelKey}
                    component={Link}
                    to={child.to}
                    label={t(child.labelKey)}
                    active={isChildActive}
                    onClick={onNavigate}
                    fw={isChildActive ? 600 : 500}
                    styles={{
                      root: {
                        borderRadius: 'var(--mantine-radius-sm)',
                        padding: '6px 12px',
                        margin: '2px 0',
                        backgroundColor: isChildActive ? 'var(--app-nav-active)' : 'transparent',
                        '&:hover': {
                          backgroundColor: isChildActive
                            ? 'var(--app-nav-active)'
                            : 'var(--app-nav-hover)',
                        },
                      },
                      label: {
                        color: isChildActive ? '#ffffff' : '#94a3b8',
                        fontSize: '13px',
                      },
                    }}
                  />
                );
              })}
            </Box>
          </NavLink>
        </Box>
      );
    }

    return (
      <NavLink
        key={item.labelKey}
        component={Link}
        to={item.to}
        label={t(item.labelKey)}
        leftSection={<Icon size={18} />}
        active={isSectionActive}
        onClick={onNavigate}
        fw={500}
        styles={{
          root: {
            borderRadius: 'var(--mantine-radius-md)',
            padding: '8px 12px',
            backgroundColor: isSectionActive ? 'var(--app-nav-active)' : 'transparent',
            '&:hover': {
              backgroundColor: isSectionActive ? 'var(--app-nav-active)' : 'var(--app-nav-hover)',
            },
          },
          label: {
            color: isSectionActive ? 'var(--app-nav-text-active)' : '#cbd5e1',
            fontSize: '13.5px',
          },
          section: {
            color: isSectionActive ? 'var(--app-nav-text-active)' : 'var(--app-nav-text-muted)',
            marginInlineEnd: 10,
          },
        }}
      />
    );
  };

  return (
    <Stack h="100%" justify="space-between" gap="sm" style={{ minHeight: 0 }}>
      {/* Top Branding matching header height (56px) */}
      <Box
        px="xs"
        h="var(--app-header-height)"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
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
        <Stack gap={3}>{navItems.map(renderItem)}</Stack>
      </ScrollArea.Autosize>

      {/* Bottom Section: Settings & Help + Agency Pro Card */}
      <Stack gap="xs" pt="xs" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Stack gap={2}>{bottomItems.map(renderItem)}</Stack>

        {/* Agency Bottom Card */}
        <Box
          p="sm"
          style={{
            borderRadius: 'var(--mantine-radius-md)',
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Stack gap={6}>
            <Group gap="xs" wrap="nowrap" align="center">
              <Box
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  backgroundColor: 'rgba(59, 130, 246, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa',
                  flexShrink: 0,
                }}
              >
                <IconSparkles size={14} />
              </Box>
              <Text size="xs" fw={700} c="#ffffff" lineClamp={1}>
                {t('shell.yourAgency')}
              </Text>
            </Group>
            <Text fz={10.5} c="#94a3b8" lh={1.3}>
              {t('shell.yourAgencySubtitle')}
            </Text>
          </Stack>
        </Box>
      </Stack>
    </Stack>
  );
}
