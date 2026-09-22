import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import {
  requestArchiveCustomer,
  requestCreateCustomer,
  requestCustomers,
  requestUpdateCustomer,
} from '../api/customers.api.ts';
import { customersQueryKeys } from '../queries/customers.queries.ts';
import type { CustomerFormValues } from '../schemas/customer.schema.ts';

export function useCustomers(search = '') {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: customersQueryKeys.list(code, search),
    queryFn: () => requestCustomers(code, search),
    staleTime: 30_000,
  });
}

export function useCustomersMutations() {
  const { code } = useAgencyContext();
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: customersQueryKeys.root(code) });

  const create = useMutation({
    mutationFn: ({ values }: { values: CustomerFormValues }) => requestCreateCustomer(code, values),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ customerCode, values }: { customerCode: string; values: CustomerFormValues }) =>
      requestUpdateCustomer(code, customerCode, values),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: ({ customerCode }: { customerCode: string }) =>
      requestArchiveCustomer(code, customerCode),
    onSuccess: invalidate,
  });

  return { create, update, archive };
}
