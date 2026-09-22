import { useTranslation } from 'react-i18next';
import { useZodForm } from '../../../components/form/use-zod-form.ts';
import {
  inviteMemberSchema,
  type InviteMemberFormValues,
} from '../schemas/invite-member.schema.ts';

export function useInviteMemberForm() {
  const { t } = useTranslation('members');

  return useZodForm<InviteMemberFormValues>({
    schema: inviteMemberSchema,
    initialValues: { email: '', roleKeys: [] },
    fieldErrorKeys: {
      email: { required: 'inviteDialog.emailRequired', invalid: 'inviteDialog.emailInvalid' },
      roleKeys: { invalid: 'inviteDialog.tooManyRoles' },
    },
    t,
  });
}
