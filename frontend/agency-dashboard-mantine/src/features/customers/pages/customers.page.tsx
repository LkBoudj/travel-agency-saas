import { CustomerFormDialog } from '../components/customer-form-dialog.tsx';
import { CustomersView } from '../components/customers-view.tsx';
import { useCustomersPage } from '../hooks/use-customers-page.ts';

export function CustomersPage() {
  const controller = useCustomersPage();

  return (
    <>
      <CustomersView {...controller} />
      {controller.isFormOpen ? (
        <CustomerFormDialog
          customer={controller.editingCustomer}
          submitting={controller.isSubmitting}
          onClose={controller.closeFormDialog}
          onSubmit={controller.submitForm}
        />
      ) : null}
    </>
  );
}
