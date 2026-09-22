import { useTranslation } from 'react-i18next';
import { Stack } from '@mantine/core';
import { EmptyState } from '../../../components/empty-state.tsx';
import { PageHeader } from '../../../components/page-header.tsx';

export function FeaturePlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation('common');
  return (
    <Stack gap="lg">
      <PageHeader title={t(titleKey)} />
      <EmptyState description={t('placeholder.body')} />
    </Stack>
  );
}
