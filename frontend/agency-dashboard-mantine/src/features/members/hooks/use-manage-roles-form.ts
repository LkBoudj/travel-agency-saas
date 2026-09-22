import { useTranslation } from 'react-i18next';
import { useZodForm } from '../../../components/form/use-zod-form.ts';
import { manageRolesSchema, type ManageRolesFormValues } from '../schemas/manage-roles.schema.ts';
import type { AgencyMember } from '../types.ts';

export function useManageRolesForm(member: AgencyMember) {
  const { t } = useTranslation('members');

  return useZodForm<ManageRolesFormValues>({
    schema: manageRolesSchema,
    initialValues: { roleKeys: member.roles.map((role) => role.key) },
    fieldErrorKeys: { roleKeys: { invalid: 'rolesDialog.tooManyRoles' } },
    t,
  });
}
