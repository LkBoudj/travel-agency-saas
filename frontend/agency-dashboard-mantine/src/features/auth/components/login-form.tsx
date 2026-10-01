import { IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, PasswordInput, Stack, TextInput } from '@mantine/core';
import { FormErrorSummary } from '../../../components/form/form-error-summary.tsx';
import { useLoginForm } from '../hooks/use-login-form.ts';

export function LoginForm() {
  const { t } = useTranslation('auth');
  const { form, handleSubmit, isPending, errorMessage } = useLoginForm();

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="md">
        <FormErrorSummary errors={form.errors} />
        <TextInput
          label={t('login.email')}
          placeholder={t('login.emailPlaceholder')}
          autoComplete="email"
          inputMode="email"
          withAsterisk
          {...form.getInputProps('email')}
        />
        <PasswordInput
          label={t('login.password')}
          placeholder={t('login.passwordPlaceholder')}
          autoComplete="current-password"
          withAsterisk
          {...form.getInputProps('password')}
        />
        {errorMessage ? (
          <Alert variant="light" color="red" radius="md" icon={<IconAlertCircle size={18} />}>
            {errorMessage}
          </Alert>
        ) : null}
        <Button type="submit" loading={isPending} fullWidth mt="xs">
          {t('login.submit')}
        </Button>
      </Stack>
    </form>
  );
}
