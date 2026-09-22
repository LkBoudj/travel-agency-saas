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
            return (
              <NavLink
                key={item.to}
                component={Link}
                to={item.to}
                label={t(item.labelKey)}
                leftSection={<Icon size={16} />}
                active={pathname === item.to}
                onClick={onNavigate}
              />
            );
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}
