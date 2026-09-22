import { useTranslation } from 'react-i18next';
import { Checkbox, Group, Loader, Stack, Text } from '@mantine/core';
import { FieldError } from '../../../components/form/field-error.tsx';
import { FormActions } from '../../../components/form/form-actions.tsx';
import { FormSection } from '../../../components/form/form-section.tsx';
import { ModalFormShell } from '../../../components/form/modal-form-shell.tsx';
import { useManageRolesForm } from '../hooks/use-manage-roles-form.ts';
import { memberDisplayName } from '../lib/member-display.ts';
import type { AgencyMember, AssignableAgencyRole } from '../types.ts';

export interface ManageRolesDialogProps {
  member: AgencyMember;
  roles: AssignableAgencyRole[];
  rolesPending: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (roleKeys: string[]) => void;
}

export function ManageRolesDialog({
  member,
  roles,
  rolesPending,
  submitting,
  onClose,
  onSubmit,
}: ManageRolesDialogProps) {
  const { t } = useTranslation('members');
  const form = useManageRolesForm(member);

  const handleSubmit = form.onSubmit((values) => {
    onSubmit(values.roleKeys);
  });

  return (
    <ModalFormShell opened onClose={onClose} title={t('rolesDialog.title')} size="md">
      <form onSubmit={handleSubmit}>
        <FormSection title={memberDisplayName(member)} description={t('rolesDialog.description')}>
          {rolesPending ? (
            <Group justify="center" py="md">
              <Loader size="sm" />
            </Group>
          ) : roles.length === 0 ? (
            <Text size="sm" c="dimmed">
              {t('rolesDialog.empty')}
            </Text>
          ) : (
            <Checkbox.Group
              value={form.values.roleKeys}
              onChange={(next) => form.setFieldValue('roleKeys', next)}
              error={form.errors.roleKeys}
            >
              <Stack gap="xs" mt="xs">
                {roles.map((role) => (
                  <Checkbox
                    key={role.key}
                    value={role.key}
                    label={role.name}
                    description={role.description ?? undefined}
                  />
                ))}
              </Stack>
            </Checkbox.Group>
          )}
          <FieldError message={form.errors.roleKeys} />
        </FormSection>
        <FormActions
          submitLabel={t('rolesDialog.submit')}
          onCancel={onClose}
          submitting={submitting}
        />
      </form>
    </ModalFormShell>
  );
}
