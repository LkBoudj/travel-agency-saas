import { useTranslation } from 'react-i18next';
import { Button, Group, Stack, Text } from '@mantine/core';
import { setLocale } from '@/i18n';
import { useAppLocale } from '@/i18n/hooks/use-app-locale';

export function HomePage() {
  const { t } = useTranslation();
  const locale = useAppLocale();

  return (
    <Stack align="center" gap="lg" mt={80}>
      <Text fw={600} size="lg">
        {t('auth.signIn')}
      </Text>
      <Text c="dimmed" size="sm">
        {t('common.loading')}
      </Text>
      <Group gap="sm">
        <Button
          size="sm"
          variant={locale === 'en' ? 'filled' : 'light'}
          onClick={() => setLocale('en')}
        >
          English
        </Button>
        <Button
          size="sm"
          variant={locale === 'ar' ? 'filled' : 'light'}
          onClick={() => setLocale('ar')}
        >
          العربية
        </Button>
      </Group>
    </Stack>
  );
}
