import { IconUserPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Divider, Stack } from '@mantine/core';
import { DataToolbar } from '../../../components/data-toolbar.tsx';
import { EmptyState as NotFoundState } from '../../../components/empty-state.tsx';
import { PageHeader } from '../../../components/page-header.tsx';
import { SearchInput } from '../../../components/search-input.tsx';
import { SectionHeader } from '../../../components/section-header.tsx';
import type { MembersPageController } from '../hooks/use-members-page.ts';
import { InvitationsTable } from './invitations-table.tsx';
import { MembersTable } from './members-table.tsx';

export function MembersView(controller: MembersPageController) {
  const { t } = useTranslation('members');

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          controller.canInvite ? (
            <Button leftSection={<IconUserPlus size={16} />} onClick={controller.openInviteDialog}>
              {t('invite')}
            </Button>
          ) : null
        }
      />

      <Stack gap="sm">
        <SectionHeader title={t('membersTitle')} />
        <DataToolbar
          search={
            <SearchInput
              value={controller.search.raw}
              onChange={controller.search.setRaw}
              placeholder={t('searchPlaceholder')}
            />
          }
        />
        <MembersTable
          members={controller.members}
          currentUserCode={controller.currentUserCode}
          canRoleManage={controller.canRoleManage}
          canUpdate={controller.canUpdate}
          canRemove={controller.canRemove}
          loading={controller.isPending}
          isError={controller.isError}
          onRetry={controller.refetch}
          onManageRoles={controller.openRolesDialog}
          onToggleStatus={controller.toggleMemberStatus}
          onRemove={controller.removeMember}
        />
      </Stack>

      {controller.canInvite ? (
        <>
          <Divider />
          <Stack gap="sm">
            <SectionHeader title={t('invitationsTitle')} />
            {!controller.invitationsPending && controller.invitations.length === 0 ? (
              <NotFoundState description={t('invitationsEmpty')} />
            ) : (
              <InvitationsTable
                invitations={controller.invitations}
                loading={controller.invitationsPending}
                canRevoke={controller.canRevoke}
                onRevoke={controller.revokeInvitation}
              />
            )}
          </Stack>
        </>
      ) : null}
    </Stack>
  );
}
