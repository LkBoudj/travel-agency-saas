import dayjs from 'dayjs';
import { IconDots, IconTrash, IconUserCheck, IconUserOff, IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Avatar, Badge, Group, Menu, Stack, Text, Tooltip } from '@mantine/core';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { ErrorState } from '../../../components/empty-state.tsx';
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
          <Avatar color="blue" radius="xl" size="md">
            {memberInitials(member)}
          </Avatar>
          <Stack gap={0} style={{ minWidth: 0 }}>
            <Group gap={6} wrap="nowrap">
              <Text fw={500} truncate>
                {memberDisplayName(member)}
              </Text>
              {member.code === currentUserCode ? (
                <Badge size="xs" variant="light" color="blue">
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
            <Badge color="blue" variant="light" size="sm">
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

        if (!showManageRoles && !showToggleStatus && !showRemove) {
          return null;
        }

        return (
          <Menu withinPortal position="bottom-end" shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label={t('menu')}>
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {showManageRoles ? (
                <Menu.Item
                  leftSection={<IconUsers size={16} />}
                  onClick={() => onManageRoles(member)}
                >
                  {t('manageRoles')}
                </Menu.Item>
              ) : null}
              {showToggleStatus ? (
                <Menu.Item
                  leftSection={
                    member.membershipStatus === 'ACTIVE' ? (
                      <IconUserOff size={16} />
                    ) : (
                      <IconUserCheck size={16} />
                    )
                  }
                  color={member.membershipStatus === 'ACTIVE' ? 'orange' : 'teal'}
                  onClick={() => onToggleStatus(member)}
                >
                  {member.membershipStatus === 'ACTIVE' ? t('suspend') : t('reactivate')}
                </Menu.Item>
              ) : null}
              {showRemove ? (
                <Menu.Item
                  leftSection={<IconTrash size={16} />}
                  color="red"
                  onClick={() => onRemove(member)}
                >
                  {t('remove')}
                </Menu.Item>
              ) : null}
            </Menu.Dropdown>
          </Menu>
        );
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
