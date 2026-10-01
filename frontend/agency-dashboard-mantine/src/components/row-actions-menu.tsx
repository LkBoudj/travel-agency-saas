import type { ReactNode } from 'react';
import { IconDots } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Menu, Tooltip } from '@mantine/core';

export interface RowAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}

/**
 * The row-level action shell every list used to rebuild: one trigger, one
 * menu, the same icon size and the same accessible name. The trigger's tooltip
 * is what names it in both locales — an unlabelled ellipsis is a mystery to a
 * screen reader.
 */
export function RowActionsMenu({
  actions,
  label,
}: {
  actions: RowAction[];
  /** Overrides the shared label when the row has an identifier worth naming. */
  label?: string;
}) {
  const { t } = useTranslation('common');
  const resolvedLabel = label ?? t('actions.rowMenu');

  // An empty menu is a control that opens onto nothing: better to render no
  // trigger at all and let the row's cell be blank.
  if (actions.length === 0) {
    return null;
  }

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Tooltip label={resolvedLabel}>
          <ActionIcon variant="subtle" color="gray" aria-label={resolvedLabel}>
            <IconDots size={16} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        {actions.map((action) => (
          <Menu.Item
            key={action.key}
            leftSection={action.icon}
            color={action.color}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
