import dayjs from 'dayjs';
import { IconSend2, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Badge, Group, Text, Tooltip } from '@mantine/core';
import { DataTable, type DataTableColumn } from '../../../components/data-table.tsx';
import { StatusBadge } from '../../../components/status-badge.tsx';
import type { MemberInvitation } from '../types.ts';

export interface InvitationsTableProps {
  invitations: MemberInvitation[];
  loading?: boolean;
  canRevoke: boolean;
  onRevoke: (invitation: MemberInvitation) => void;
}

export function InvitationsTable({
  invitations,
  loading,
  canRevoke,
  onRevoke,
}: InvitationsTableProps) {
  const { t } = useTranslation('members');

  const columns: DataTableColumn<MemberInvitation>[] = [
    {
      key: 'email',
      header: t('inviteDialog.email'),
      w: '60%',
      render: (invitation) => (
        <Group gap="xs" wrap="nowrap">
          <IconSend2 size={16} />
          <Text fw={500} truncate>
            {invitation.email}
          </Text>
        </Group>
      ),
    },
    {
      key: 'roles',
      header: t('columns.roles'),
      render: (invitation) => (
        <Group gap={4}>
          {invitation.roles.length === 0 ? (
            <Text size="xs" c="dimmed">
              {t('noRoles')}
            </Text>
          ) : (
            invitation.roles.map((role) => (
              <Tooltip key={role.key} label={role.name}>
                <Badge color="gray" variant="outline" size="sm">
                  {role.name}
                </Badge>
              </Tooltip>
            ))
          )}
        </Group>
      ),
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (invitation) => <StatusBadge status={invitation.status} />,
    },
    {
      key: 'created',
      header: t('columns.created'),
      render: (invitation) => (
        <Text size="sm" c="dimmed">
          {dayjs(invitation.createdAt).format('ll')}
        </Text>
      ),
    },
    {
      key: 'actions',
      header: '',
      w: 48,
      render: (invitation) =>
        canRevoke && invitation.status === 'PENDING' ? (
          <Tooltip label={t('revoke')}>
            <ActionIcon
              variant="subtle"
              color="red"
              aria-label={t('revoke')}
              onClick={() => onRevoke(invitation)}
            >
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        ) : null,
    },
  ];

  return (
    <DataTable
      rows={invitations}
      columns={columns}
      keyOf={(invitation) => invitation.code}
      loading={loading}
      emptyState={t('invitationsEmpty')}
    />
  );
}
