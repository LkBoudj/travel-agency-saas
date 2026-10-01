import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useConfirmDialog } from '../../../components/confirm-dialog.tsx';
import { useDebouncedSearch } from '../../../components/search-input.tsx';
import { customerDisplayName } from '../lib/customer-display.ts';
import { getCustomerErrorMessage } from '../lib/customer-error-messages.ts';
import { filterCustomersByStatus, type CustomerStatusFilter } from '../lib/customer-filter.ts';
import type { CustomerFormValues } from '../schemas/customer.schema.ts';
import type { Customer } from '../types.ts';
import { useCustomerCapabilities } from './use-customer-capabilities.ts';
import { useCustomers, useCustomersMutations } from './use-customers.ts';

export type CustomerFormState = { mode: 'create' } | { mode: 'edit'; customer: Customer } | null;

export interface CustomersPageController {
  /** Rows after the status filter, which is what the table and the count show. */
  customers: Customer[];
  status: CustomerStatusFilter;
  setStatus: (status: CustomerStatusFilter) => void;
  isPending: boolean;
  isError: boolean;
  refetch: () => void;
  search: ReturnType<typeof useDebouncedSearch>;
  canCreate: boolean;
  canUpdate: boolean;
  canArchive: boolean;
  formState: Exclude<CustomerFormState, null>;
  isFormOpen: boolean;
  editingCustomer: Customer | null;
  openCreateDialog: () => void;
  openEditDialog: (customer: Customer) => void;
  closeFormDialog: () => void;
  submitForm: (values: CustomerFormValues) => void;
  isSubmitting: boolean;
  archiveCustomer: (customer: Customer) => void;
}

export function useCustomersPage(): CustomersPageController {
  const { t } = useTranslation('customers');
  const confirm = useConfirmDialog();
  const capabilities = useCustomerCapabilities();
  const { raw, value, setRaw } = useDebouncedSearch();

  const customersQuery = useCustomers(value);
  const { create, update, archive } = useCustomersMutations();

  const [status, setStatus] = useState<CustomerStatusFilter>('all');

  const [formState, setFormState] = useState<CustomerFormState>(null);

  const openCreateDialog = () => setFormState({ mode: 'create' });
  const openEditDialog = (customer: Customer) => setFormState({ mode: 'edit', customer });
  const closeFormDialog = () => setFormState(null);

  const notifyError = (error: unknown) => {
    notifications.show({ message: getCustomerErrorMessage(error, t), color: 'red' });
  };

  const submitForm = (values: CustomerFormValues) => {
    const onSuccess = (key: string) => {
      closeFormDialog();
      notifications.show({ message: t(key), color: 'teal' });
    };

    if (formState?.mode === 'edit') {
      update.mutate(
        { customerCode: formState.customer.code, values },
        {
          onSuccess: () => onSuccess('editDialog.success'),
          onError: notifyError,
        }
      );
      return;
    }
    create.mutate(
      { values },
      {
        onSuccess: () => onSuccess('createDialog.success'),
        onError: notifyError,
      }
    );
  };

  const archiveCustomer = (customer: Customer) => {
    confirm({
      title: t('confirm.archiveTitle', { name: customerDisplayName(customer) }),
      message: t('confirm.archiveBody'),
      color: 'red',
      onConfirm: () =>
        archive.mutate(
          { customerCode: customer.code },
          {
            onError: notifyError,
          }
        ),
    });
  };

  return {
    customers: filterCustomersByStatus(customersQuery.data ?? [], status),
    status,
    setStatus,
    isPending: customersQuery.isPending,
    isError: customersQuery.isError,
    refetch: customersQuery.refetch,
    search: { raw, value, setRaw },
    canCreate: capabilities.canCreate,
    canUpdate: capabilities.canUpdate,
    canArchive: capabilities.canArchive,
    formState: formState ?? { mode: 'create' },
    isFormOpen: formState !== null,
    editingCustomer: formState?.mode === 'edit' ? formState.customer : null,
    openCreateDialog,
    openEditDialog,
    closeFormDialog,
    submitForm,
    isSubmitting: create.isPending || update.isPending,
    archiveCustomer,
  };
}
