import { IconUserPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Stack } from '@mantine/core';
import { PageHeader } from '../../../components/page-header.tsx';
import { SearchInput } from '../../../components/search-input.tsx';
import type { CustomersPageController } from '../hooks/use-customers-page.ts';
import { CustomersTable } from './customers-table.tsx';

export function CustomersView(controller: CustomersPageController) {
  const { t } = useTranslation('customers');

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          controller.canCreate ? (
            <Button leftSection={<IconUserPlus size={16} />} onClick={controller.openCreateDialog}>
              {t('create')}
            </Button>
          ) : null
        }
      />

      <Card withBorder radius="md" p="xs">
        <Stack gap="sm">
          <SearchInput
            value={controller.search.raw}
            onChange={controller.search.setRaw}
            placeholder={t('searchPlaceholder')}
          />
          <CustomersTable
            customers={controller.customers}
            canUpdate={controller.canUpdate}
            canArchive={controller.canArchive}
            loading={controller.isPending}
            isError={controller.isError}
            onRetry={controller.refetch}
            onEdit={controller.openEditDialog}
            onArchive={controller.archiveCustomer}
          />
        </Stack>
      </Card>
    </Stack>
  );
}
