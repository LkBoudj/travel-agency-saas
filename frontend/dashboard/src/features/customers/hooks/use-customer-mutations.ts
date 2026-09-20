import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  archiveCustomer,
  createCustomer,
  customersQueryKeys,
  updateCustomer,
} from "../api/customers.api"
import type { CustomerPayload } from "../types/customers.types"

/**
 * Every customer mutation invalidates the same narrow slice: this agency's
 * customer queries and nothing else.
 *
 * The key is prefixed with the agency code, so a change here never refetches
 * another agency's data — or the rest of the application.
 */
function useInvalidateCustomers(agencyCode: string) {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({
      queryKey: customersQueryKeys.all(agencyCode),
    })
}

export function useCreateCustomer(agencyCode: string) {
  const invalidate = useInvalidateCustomers(agencyCode)
  return useMutation({
    mutationFn: (payload: CustomerPayload) =>
      createCustomer(agencyCode, payload),
    onSuccess: invalidate,
  })
}

export function useUpdateCustomer(agencyCode: string) {
  const invalidate = useInvalidateCustomers(agencyCode)
  return useMutation({
    mutationFn: (input: { customerCode: string; payload: CustomerPayload }) =>
      updateCustomer(agencyCode, input.customerCode, input.payload),
    onSuccess: invalidate,
  })
}

export function useArchiveCustomer(agencyCode: string) {
  const invalidate = useInvalidateCustomers(agencyCode)
  return useMutation({
    mutationFn: (customerCode: string) =>
      archiveCustomer(agencyCode, customerCode),
    onSuccess: invalidate,
  })
}