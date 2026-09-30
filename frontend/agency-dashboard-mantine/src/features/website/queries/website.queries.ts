export const websiteQueryKeys = {
  root: (agencyCode: string) => ['agency', agencyCode, 'website'] as const,
  published: (agencyCode: string) => ['agency', agencyCode, 'website', 'published'] as const,
  draft: (agencyCode: string) => ['agency', agencyCode, 'website', 'draft'] as const,
  tourCatalog: (agencyCode: string) => ['agency', agencyCode, 'website', 'tour-catalog'] as const,
};
