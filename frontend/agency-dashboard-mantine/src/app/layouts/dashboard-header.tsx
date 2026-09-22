import {
  IconBuildingSkyscraper,
  IconChevronDown,
  IconLogout,
  IconSwitchHorizontal,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Burger, Group, Menu, Text, UnstyledButton } from '@mantine/core';
import { SUPPORTED_LOCALES, type AppLocale } from '../../i18n/locales.ts';
import { useDashboardHeader } from './hooks/use-dashboard-header.ts';

const LOCALE_LABEL: Record<AppLocale, string> = { en: 'en', ar: 'ar' };

export function DashboardHeader({ onToggleNav }: { onToggleNav: () => void }) {
  const { t } = useTranslation('common');
  const {
    agencyName,
    agencyCode,
    membershipLabel,
    roles,
    locale,
    handleSetLocale,
    handleSignOut,
    handleSwitchAgency,
  } = useDashboardHeader();

  return (
    <Group h="100%" px="md" justify="space-between" wrap="nowrap">
      <Group gap="sm" wrap="nowrap">
        <Burger onClick={onToggleNav} hiddenFrom="sm" size="sm" />
        <Group gap={8} wrap="nowrap">
          <IconBuildingSkyscraper size={20} />
          <Text fw={700} visibleFrom="xs">
            {agencyName}
          </Text>
          <Text size="xs" c="dimmed" ff="monospace">
            {agencyCode}
          </Text>
        </Group>
      </Group>

      <Group gap="xs" wrap="nowrap">
        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="light" aria-label={t('auth.language')}>
              {LOCALE_LABEL[locale]}
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {SUPPORTED_LOCALES.map((lng) => (
              <Menu.Item
                key={lng}
                onClick={() => handleSetLocale(lng)}
                rightSection={lng === locale ? '✓' : null}
              >
                {t(`lang.${lng}`)}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>

        <Menu shadow="md" width={260} position="bottom-end">
          <Menu.Target>
            <UnstyledButton style={{ borderRadius: 'var(--mantine-radius-md)', padding: 6 }}>
              <Group gap={8} wrap="nowrap">
                <Text size="sm" fw={600} maw={160} lineClamp={1}>
                  {membershipLabel}
                </Text>
                <IconChevronDown size={14} />
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{t('shell.signedAs')}</Menu.Label>
            <Menu.Item disabled>{membershipLabel}</Menu.Item>
            <Menu.Label>{t('shell.memberOf')}</Menu.Label>
            {roles.length === 0 ? (
              <Menu.Item disabled>—</Menu.Item>
            ) : (
              roles.map((role) => (
                <Menu.Item key={role.key} disabled>
                  {role.name}
                </Menu.Item>
              ))
            )}
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconSwitchHorizontal size={15} />}
              onClick={handleSwitchAgency}
            >
              {t('shell.switchAgency')}
            </Menu.Item>
            <Menu.Item color="red" leftSection={<IconLogout size={15} />} onClick={handleSignOut}>
              {t('auth.signOut')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
