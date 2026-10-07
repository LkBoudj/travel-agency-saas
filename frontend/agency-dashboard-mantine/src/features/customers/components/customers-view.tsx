import { IconUserPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Select, Stack, Text } from '@mantine/core';
import { ContentContainer } from '../../../components/content-container.tsx';
import { DataToolbar } from '../../../components/data-toolbar.tsx';
import { PageHeader } from '../../../components/page-header.tsx';
import { Panel } from '../../../components/panel.tsx';
import { SearchInput } from '../../../components/search-input.tsx';
import { SectionHeader } from '../../../components/section-header.tsx';
import type { CustomersPageController } from '../hooks/use-customers-page.ts';
import type { CustomerStatusFilter } from '../lib/customer-filter.ts';
import { CustomersTable } from './customers-table.tsx';

const STATUS_OPTIONS: readonly { value: CustomerStatusFilter; label: string }[] = [
  { value: 'all', label: 'statusFilter.all' },
  { value: 'ACTIVE', label: 'statusFilter.active' },
  { value: 'ARCHIVED', label: 'statusFilter.archived' },
];

export function CustomersView(controller: CustomersPageController) {
  const { t } = useTranslation('customers');
  const { t: tCommon } = useTranslation('common');

  return (
    <ContentContainer>
      <Stack gap="lg">
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
          actions={
            controller.canCreate ? (
              <Button
                color="blue"
                leftSection={<IconUserPlus size={16} />}
                onClick={controller.openCreateDialog}
                styles={{
                  root: {
                    backgroundColor: 'var(--app-action-primary)',
                    fontWeight: 600,
                  },
                }}
              >
                {t('create')}
              </Button>
            ) : null
          }
        />

        <DataToolbar
          search={
            <SearchInput
              value={controller.search.raw}
              onChange={controller.search.setRaw}
              placeholder={t('searchPlaceholder')}
            />
          }
          filters={
            <Select
              value={controller.status}
              onChange={(value) => controller.setStatus((value ?? 'all') as CustomerStatusFilter)}
              data={STATUS_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.label),
              }))}
              w={180}
              aria-label={t('statusFilter.label')}
              allowDeselect={false}
            />
          }
          actions={
            <Text size="sm" c="dimmed" aria-live="polite">
              {tCommon('list.results', { count: controller.customers.length })}
            </Text>
          }
        />

        <Stack gap="md">
          <SectionHeader title={t('columns.tableCaption')} />
          <Panel p={0} style={{ overflow: 'hidden' }}>
            <CustomersTable
              customers={controller.customers}
              canUpdate={controller.canUpdate}
              canArchive={controller.canArchive}
              loading={controller.isPending}
              isError={controller.isError}
              onRetry={controller.refetch}
              onEdit={controller.openEditDialog}
              onArchive={controller.archiveCustomer}
              emptyAction={
                controller.canCreate ? (
                  <Button
                    color="blue"
                    leftSection={<IconUserPlus size={16} />}
                    onClick={controller.openCreateDialog}
                    styles={{
                      root: { backgroundColor: 'var(--app-action-primary)', fontWeight: 600 },
                    }}
                  >
                    {t('create')}
                  </Button>
                ) : undefined
              }
            />
          </Panel>
        </Stack>
      </Stack>
    </ContentContainer>
  );
}
