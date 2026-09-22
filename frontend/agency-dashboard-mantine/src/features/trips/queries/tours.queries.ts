export const toursQueryKeys = {
  list: (agencyCode: string, search = '', status?: string) =>
    ['agency', agencyCode, 'tours', 'list', search, status ?? 'all'] as const,
  detail: (agencyCode: string, tourCode: string) =>
    ['agency', agencyCode, 'tours', 'detail', tourCode] as const,
  root: (agencyCode: string) => ['agency', agencyCode, 'tours'] as const,
};
