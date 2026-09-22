export const customersQueryKeys = {
  list: (agencyCode: string, search = '') =>
    ['agency', agencyCode, 'customers', 'list', search] as const,
  detail: (agencyCode: string, customerCode: string) =>
    ['agency', agencyCode, 'customers', 'detail', customerCode] as const,
  root: (agencyCode: string) => ['agency', agencyCode, 'customers'] as const,
};
