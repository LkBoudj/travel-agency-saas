import dayjs from 'dayjs';
import { IconTrash, IconUserCheck, IconUserOff, IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Avatar, Badge, Group, Stack, Text, Tooltip } from '@mantine/core';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { ErrorState } from '../../../components/empty-state.tsx';
import { RowActionsMenu, type RowAction } from '../../../components/row-actions-menu.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import {
  canManageMemberRoles,
  canRemoveMember,
  canToggleMemberStatus,
} from '../lib/member-actions.ts';
import { memberDisplayName, memberInitials } from '../lib/member-display.ts';
import type { AgencyMember } from '../types.ts';

export interface MembersTableProps {
  members: AgencyMember[];
  currentUserCode?: string;
  canRoleManage: boolean;
  canUpdate: boolean;
  canRemove: boolean;
  loading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onManageRoles: (member: AgencyMember) => void;
  onToggleStatus: (member: AgencyMember) => void;
  onRemove: (member: AgencyMember) => void;
}

export function MembersTable({
  members,
  currentUserCode,
  canRoleManage,
  canUpdate,
  canRemove,
  loading,
  isError,
  onRetry,
  onManageRoles,
  onToggleStatus,
  onRemove,
}: MembersTableProps) {
  const { t } = useTranslation('members');

  const columns: DataTableColumn<AgencyMember>[] = [
    {
      key: 'member',
      header: t('columns.member'),
      w: '40%',
      render: (member) => (
        <Group gap="sm" wrap="nowrap">
          <Avatar color="brand" radius="xl" size="md">
            {memberInitials(member)}
          </Avatar>
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Group gap={6} wrap="nowrap">
              <Text fw={500} truncate>
                {memberDisplayName(member)}
              </Text>
              {member.code === currentUserCode ? (
                <Badge size="xs" variant="light" color="brand">
                  {t('you')}
                </Badge>
              ) : null}
            </Group>
            <Text size="xs" c="dimmed" truncate>
              {member.email}
            </Text>
          </Stack>
        </Group>
      ),
    },
    {
      key: 'roles',
      header: t('columns.roles'),
      render: (member) => (
        <Group gap={4}>
          {member.membershipType === 'OWNER' ? (
            <Badge color="brand" variant="light" size="sm">
              {t('owner')}
            </Badge>
          ) : null}
          {member.roles.map((role) => (
            <Tooltip key={role.key} label={role.name}>
              <Badge color="gray" variant="outline" size="sm">
                {role.name}
              </Badge>
            </Tooltip>
          ))}
          {member.membershipType !== 'OWNER' && member.roles.length === 0 ? (
            <Text size="xs" c="dimmed">
              {t('noRoles')}
            </Text>
          ) : null}
        </Group>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (member) => <StatusBadge status={member.membershipStatus} />,
    },
    {
      key: 'joined',
      header: t('columns.joined'),
      render: (member) => (
        <Text size="sm" c="dimmed">
          {dayjs(member.joinedAt).format('ll')}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: '',
      w: 48,
      render: (member) => {
        const showManageRoles = canRoleManage && canManageMemberRoles(member);
        const showToggleStatus = canUpdate && canToggleMemberStatus(member);
        const showRemove = canRemove && canRemoveMember(member);
        const isActive = member.membershipStatus === 'ACTIVE';

        const actions: RowAction[] = [
          ...(showManageRoles
            ? [
                {
                  key: 'roles',
                  label: t('manageRoles'),
                  icon: <IconUsers size={16} />,
                  onClick: () => onManageRoles(member),
                },
              ]
            : []),
          ...(showToggleStatus
            ? [
                {
                  key: 'status',
                  label: isActive ? t('suspend') : t('reactivate'),
                  icon: isActive ? <IconUserOff size={16} /> : <IconUserCheck size={16} />,
                  // Suspending is a caution; re-admitting is a recovery.
                  color: isActive ? 'warning' : 'success',
                  onClick: () => onToggleStatus(member),
                },
              ]
            : []),
          ...(showRemove
            ? [
                {
                  key: 'remove',
                  label: t('remove'),
                  icon: <IconTrash size={16} />,
                  color: 'danger',
                  onClick: () => onRemove(member),
                },
              ]
            : []),
        ];

        return <RowActionsMenu actions={actions} label={t('menu')} />;
      },
    },
  ];

  if (isError) {
    return <ErrorState title={t('loadError')} onRetry={onRetry} />;
  }

  return (
    <DataTable
      rows={members}
      columns={columns}
      keyOf={(member) => member.code}
      loading={loading}
      emptyState={t('membersEmpty')}
    />
  );
}
