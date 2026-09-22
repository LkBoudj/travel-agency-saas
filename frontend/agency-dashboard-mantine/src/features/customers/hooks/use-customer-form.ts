import { useTranslation } from 'react-i18next';
import { useZodForm } from '../../../components/form/use-zod-form.ts';
import { customerSchema, type CustomerFormValues } from '../schemas/customer.schema.ts';

export const EMPTY_CUSTOMER_FORM: CustomerFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: '',
};

export function customerFormInitialValues(
  customer: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
  } | null
): CustomerFormValues {
  if (!customer) {
    return EMPTY_CUSTOMER_FORM;
  }
  return {
    firstName: customer.firstName ?? '',
    lastName: customer.lastName ?? '',
    email: customer.email ?? '',
    phone: customer.phone ?? '',
    notes: customer.notes ?? '',
  };
}

export function useCustomerForm(initialValues: CustomerFormValues) {
  const { t } = useTranslation('customers');

  return useZodForm<CustomerFormValues>({
    schema: customerSchema,
    initialValues,
    fieldErrorKeys: {
      firstName: { invalid: 'errors.nameTooLong' },
      lastName: { invalid: 'errors.nameTooLong' },
      email: { invalid: 'errors.emailInvalid' },
      phone: { invalid: 'errors.phoneTooLong' },
      notes: { invalid: 'errors.notesTooLong' },
    },
    t,
  });
}
