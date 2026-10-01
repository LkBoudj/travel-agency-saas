import { useTranslation } from 'react-i18next';
import { Burger, Group, Text } from '@mantine/core';
import { useActiveNavLocation } from './hooks/use-nav-items.ts';

/**
 * The header band: a quiet strip that says where you are.
 *
 * The spec's top utility area is deliberately thin — identity, language, and the
 * account menu all moved to the rail footer, so nothing is left here but the
 * breadcrumb and the mobile nav toggle. The breadcrumb is derived from the route
 * and the existing nav definition, so it costs no request and cannot disagree with
 * what the sidebar is already showing.
 *
 * It is not a heading. The page's own `PageHeader` owns the single `h1`, and a
 * second one here would put two of them on every page.
 */
export function DashboardHeader({ onToggleNav }: { onToggleNav: () => void }) {
  const { t } = useTranslation('common');
  const location = useActiveNavLocation();
  const groupLabel = location ? t(location.groupLabelKey) : null;
  const itemLabel = location ? t(location.itemLabelKey) : null;
  const showSeparator = groupLabel !== null && itemLabel !== null && groupLabel !== itemLabel;

  return (
    <Group h="100%" px={{ base: 'sm', sm: 'lg' }} justify="space-between" wrap="nowrap">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <Burger onClick={onToggleNav} hiddenFrom="sm" size="sm" aria-label={t('shell.openNav')} />
        {groupLabel !== null && itemLabel !== null ? (
          <Group
            component="nav"
            aria-label={t('shell.breadcrumb')}
            gap="xs"
            wrap="nowrap"
            style={{ minWidth: 0 }}
          >
            <Text size="xs" fw={500} c="dimmed">
              {groupLabel}
            </Text>
            {showSeparator ? (
              <Text size="xs" c="dimmed" aria-hidden>
                /
              </Text>
            ) : null}
            <Text size="xs" fw={600} c="var(--app-ink)" lineClamp={1}>
              {itemLabel}
            </Text>
          </Group>
        ) : null}
      </Group>
    </Group>
  );
}
