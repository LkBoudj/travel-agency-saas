import { useTranslation } from 'react-i18next';
import { Paper, Stack, Text, Title } from '@mantine/core';
import { LoginForm } from '../components/login-form.tsx';

export function LoginPage() {
  const { t } = useTranslation('auth');

  return (
    <Paper withBorder shadow="sm" radius="lg" p={{ base: 'lg', sm: 40 }} maw={440} w="100%">
      <Stack gap="xs" mb="xl" align="center">
        <Title order={2}>{t('login.title')}</Title>
        <Text c="dimmed" size="sm">
          {t('login.subtitle')}
        </Text>
      </Stack>
      <LoginForm />
      <Text c="dimmed" size="xs" ta="center" mt="xl">
        Demo account: owner@agency.example
      </Text>
    </Paper>
  );
}
