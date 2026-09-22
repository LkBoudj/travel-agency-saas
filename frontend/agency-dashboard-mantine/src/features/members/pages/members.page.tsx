import {
  InviteMemberDialog,
  type InviteMemberDialogProps,
} from '../components/invite-member-dialog.tsx';
import {
  ManageRolesDialog,
  type ManageRolesDialogProps,
} from '../components/manage-roles-dialog.tsx';
import { MembersView } from '../components/members-view.tsx';
import { useMembersPage } from '../hooks/use-members-page.ts';

export function MembersPage() {
  const controller = useMembersPage();

  const inviteDialogProps: InviteMemberDialogProps = {
    roles: controller.availableRoles,
    rolesPending: controller.rolesPending,
    canAssignRoles: controller.canAssignRoles,
    submitting: controller.isSubmittingInvite,
    onClose: controller.closeInviteDialog,
    onSubmit: controller.submitInvite,
  };

  const rolesDialogProps: ManageRolesDialogProps | null = controller.rolesTarget
    ? {
        member: controller.rolesTarget,
        roles: controller.availableRoles,
        rolesPending: controller.rolesPending,
        submitting: controller.isSavingRoles,
        onClose: controller.closeRolesDialog,
        onSubmit: controller.saveMemberRoles,
      }
    : null;

  return (
    <>
      <MembersView {...controller} />
      {controller.isInviteDialogOpen ? <InviteMemberDialog {...inviteDialogProps} /> : null}
      {rolesDialogProps ? <ManageRolesDialog {...rolesDialogProps} /> : null}
    </>
  );
}
