export const themesQueryKeys = {
  all: ['themes-manifest'] as const,
  manifest: () => [...themesQueryKeys.all, 'manifest'] as const,
};
