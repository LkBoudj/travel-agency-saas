export const agencyQueryKeys = {
  myAgencies: () => ['me', 'agencies'] as const,
  access: (agencyCode: string) => ['agency', agencyCode, 'access'] as const,
};
