import { useTranslation } from 'react-i18next';
import { Checkbox, Group, Loader, Stack, Text, TextInput } from '@mantine/core';
import { FieldError } from '../../../components/form/field-error.tsx';
import { FormActions } from '../../../components/form/form-actions.tsx';
import { FormSection } from '../../../components/form/form-section.tsx';
import { ModalFormShell } from '../../../components/form/modal-form-shell.tsx';
import { useInviteMemberForm } from '../hooks/use-invite-member-form.ts';
import type { AssignableAgencyRole } from '../types.ts';

export interface InviteMemberDialogProps {
  roles: AssignableAgencyRole[];
  rolesPending: boolean;
  canAssignRoles: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: { email: string; roleKeys: string[] }) => void;
}

export function InviteMemberDialog({
  roles,
  rolesPending,
  canAssignRoles,
  submitting,
  onClose,
  onSubmit,
}: InviteMemberDialogProps) {
  const { t } = useTranslation('members');
  const form = useInviteMemberForm();

  const handleSubmit = form.onSubmit(onSubmit);

  return (
    <ModalFormShell opened onClose={onClose} title={t('inviteDialog.title')} size="md">
      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          <FormSection title={t('inviteDialog.email')}>
            <TextInput
              placeholder={t('inviteDialog.emailPlaceholder')}
              autoFocus
              {...form.getInputProps('email')}
            />
          </FormSection>

          {canAssignRoles ? (
            <FormSection
              title={t('inviteDialog.roles')}
              description={t('inviteDialog.rolesDescription')}
            >
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
          ) : null}
        </Stack>

        <FormActions
          submitLabel={t('inviteDialog.submit')}
          onCancel={onClose}
          submitting={submitting}
        />
      </form>
    </ModalFormShell>
  );
}
