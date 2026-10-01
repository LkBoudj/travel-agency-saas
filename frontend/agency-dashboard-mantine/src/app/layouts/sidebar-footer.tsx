import {
  IconBuildingSkyscraper,
  IconChevronDown,
  IconLogout,
  IconSwitchHorizontal,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Divider, Group, Menu, Stack, Text, UnstyledButton } from '@mantine/core';
import { SUPPORTED_LOCALES, type AppLocale } from '../../i18n/locales.ts';
import { useSidebarFooter } from './hooks/use-sidebar-footer.ts';

const LOCALE_LABEL: Record<AppLocale, string> = { en: 'en', ar: 'ar' };

/**
 * The rail's bottom block: who you are, which language, and how you get out.
 *
 * The design spec asks for identity, language, and account to read as secondary
 * rather than competing with the page, and for the account area to sit near the
 * bottom of the rail. Both fall out of one move: these controls live here instead
 * of in the header band, which is now a 44px strip. Nothing is duplicated — the
 * header no longer carries any of it.
 *
 * Menus themselves stay on Mantine's default light surface. A floating menu is
 * not part of the rail: giving it a dark fill would mean restyling every overlay
 * in the app to match chrome it is not part of.
 */
export function SidebarFooter() {
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
  } = useSidebarFooter();

  return (
    <Stack gap="xs">
      <Divider color="var(--app-nav-border)" />
      <Group gap="xs" wrap="nowrap" px="xs" pt={2}>
        <IconBuildingSkyscraper size={16} color="var(--app-nav-text-muted)" aria-hidden />
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text size="xs" fw={600} c="var(--app-nav-text)" lineClamp={1}>
            {agencyName}
          </Text>
          <Text size="xs" c="var(--app-nav-text-muted)" ff="monospace" lineClamp={1}>
            {agencyCode}
          </Text>
        </Stack>
      </Group>

      <Menu shadow="md" width={220} position="top-end">
        <Menu.Target>
          <UnstyledButton
            aria-label={t('shell.openAccount')}
            style={{
              borderRadius: 'var(--mantine-radius-md)',
              padding: '6px 8px',
              color: 'var(--app-nav-text)',
            }}
          >
            <Group gap={8} wrap="nowrap" justify="space-between">
              <Text size="sm" lineClamp={1}>
                {membershipLabel}
              </Text>
              <IconChevronDown size={14} aria-hidden />
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
          <Menu.Item leftSection={<IconSwitchHorizontal size={15} />} onClick={handleSwitchAgency}>
            {t('shell.switchAgency')}
          </Menu.Item>
          <Menu.Item color="danger" leftSection={<IconLogout size={15} />} onClick={handleSignOut}>
            {t('auth.signOut')}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <Menu shadow="md" width={180} position="top-end">
        <Menu.Target>
          <ActionIcon
            variant="subtle"
            aria-label={t('auth.language')}
            style={{ color: 'var(--app-nav-text)' }}
          >
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
    </Stack>
  );
}
