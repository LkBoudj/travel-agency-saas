// app-allow-raw-hex: avatar brand blue
import {
  IconBell,
  IconChevronDown,
  IconHelpCircle,
  IconLogout,
  IconSearch,
  IconSwitchHorizontal,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ActionIcon,
  Avatar,
  Burger,
  Button,
  Group,
  Kbd,
  Menu,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
  VisuallyHidden,
} from '@mantine/core';
import { useCurrentUser } from '../../features/auth/hooks/use-auth.ts';
import { useActiveNavLocation } from './hooks/use-nav-items.ts';
import { useSidebarFooter } from './hooks/use-sidebar-footer.ts';

export function DashboardHeader({ onToggleNav }: { onToggleNav: () => void }) {
  const { t } = useTranslation('common');
  const location = useActiveNavLocation();
  const { data: user } = useCurrentUser();
  const {
    agencyName,
    agencyCode,
    membershipLabel,
    locale,
    handleSetLocale,
    handleSignOut,
    handleSwitchAgency,
  } = useSidebarFooter();

  const groupLabel = location ? t(location.groupLabelKey) : null;
  const itemLabel = location ? t(location.itemLabelKey) : null;
  const showSeparator = groupLabel !== null && itemLabel !== null && groupLabel !== itemLabel;

  const displayName =
    user?.firstName || user?.lastName
      ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
      : 'Lakhdar Boudjahfa';

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : 'TB';

  const roleLabel = membershipLabel || t('shell.agencyOwner');

  return (
    <Group h="100%" px={{ base: 'sm', sm: 'xl' }} justify="space-between" wrap="nowrap">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <Burger onClick={onToggleNav} hiddenFrom="sm" size="sm" aria-label={t('shell.openNav')} />

        {/* Search input per approved visual reference */}
        <TextInput
          leftSection={<IconSearch size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />}
          rightSection={
            <Kbd
              size="xs"
              styles={{
                root: {
                  fontSize: 10,
                  padding: '2px 5px',
                  color: '#64748b',
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                },
              }}
            >
              Ctrl K
            </Kbd>
          }
          rightSectionWidth={60}
          placeholder={t('shell.searchPlaceholder')}
          size="sm"
          radius="md"
          w={{ base: 180, sm: 280, md: 380 }}
          styles={{
            input: {
              backgroundColor: '#f8fafc',
              borderColor: '#e2e8f0',
              fontSize: '13px',
              height: 36,
            },
          }}
        />

        {/* Semantic breadcrumb preserved for navigation landmarks / screen readers */}
        {groupLabel !== null && itemLabel !== null ? (
          <VisuallyHidden>
            <Group component="nav" aria-label={t('shell.breadcrumb')} gap="xs" wrap="nowrap">
              <Text size="xs" fw={500} c="dimmed">
                {groupLabel}
              </Text>
              {showSeparator ? (
                <Text size="xs" c="dimmed" aria-hidden>
                  /
                </Text>
              ) : null}
              <Text size="xs" fw={600} c="var(--app-ink)">
                {itemLabel}
              </Text>
            </Group>
          </VisuallyHidden>
        ) : null}
      </Group>

      {/* Top right utility area */}
      <Group gap="md" wrap="nowrap" align="center">
        {/* Help icon linked to agency help route */}
        <ActionIcon
          component={Link}
          to={`/${agencyCode}/help`}
          variant="subtle"
          color="gray"
          size="md"
          aria-label={t('nav.help')}
          style={{ color: '#64748b' }}
        >
          <IconHelpCircle size={18} stroke={1.5} />
        </ActionIcon>

        {/* Notifications (no fake count badge) */}
        <ActionIcon
          variant="subtle"
          color="gray"
          size="md"
          aria-label={t('shell.notifications')}
          style={{ color: '#64748b' }}
        >
          <IconBell size={18} stroke={1.5} />
        </ActionIcon>

        {/* Language switch EN | عربي */}
        <Group gap={2} align="center" wrap="nowrap">
          <Button
            size="compact-xs"
            variant="subtle"
            c={locale === 'en' ? 'var(--app-nav-active)' : 'dimmed'}
            fw={locale === 'en' ? 600 : 400}
            aria-label={t('lang.en')}
            onClick={() => handleSetLocale('en')}
            styles={{ root: { padding: '0 4px', fontSize: '13px' } }}
          >
            EN
          </Button>
          <Text size="xs" c="dimmed" aria-hidden>
            |
          </Text>
          <Button
            size="compact-xs"
            variant="subtle"
            c={locale === 'ar' ? 'var(--app-nav-active)' : 'dimmed'}
            fw={locale === 'ar' ? 600 : 400}
            aria-label={t('lang.ar')}
            onClick={() => handleSetLocale('ar')}
            styles={{ root: { padding: '0 4px', fontSize: '13px' } }}
          >
            عربي
          </Button>
        </Group>

        {/* User Account / Avatar Menu */}
        <Menu shadow="md" width={220} position="bottom-end">
          <Menu.Target>
            <UnstyledButton aria-label={t('shell.openAccount')}>
              <Group gap="xs" wrap="nowrap" align="center">
                <Avatar
                  size={32}
                  radius="xl"
                  color="blue"
                  styles={{
                    placeholder: {
                      backgroundColor: '#dbeafe',
                      color: '#1d4ed8',
                      fontWeight: 700,
                      fontSize: '12px',
                    },
                  }}
                >
                  {initials}
                </Avatar>
                <Stack gap={0} visibleFrom="sm" style={{ textAlign: 'start' }}>
                  <Text size="xs" fw={600} c="var(--app-ink)" lineClamp={1}>
                    {agencyName || displayName}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1} fz={11}>
                    {roleLabel}
                  </Text>
                </Stack>
                <IconChevronDown size={14} color="var(--mantine-color-dimmed)" aria-hidden />
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>{t('shell.signedAs')}</Menu.Label>
            <Menu.Item disabled>{displayName}</Menu.Item>
            <Menu.Label>{t('shell.memberOf')}</Menu.Label>
            <Menu.Item disabled>{agencyName}</Menu.Item>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconSwitchHorizontal size={15} />}
              onClick={handleSwitchAgency}
            >
              {t('shell.switchAgency')}
            </Menu.Item>
            <Menu.Item
              color="danger"
              leftSection={<IconLogout size={15} />}
              onClick={handleSignOut}
            >
              {t('auth.signOut')}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Group>
  );
}
