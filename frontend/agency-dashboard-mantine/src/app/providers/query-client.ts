import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../services/api-error.ts';

/**
 * The app's single TanStack Query configuration.
 *
 * Lives beside the provider that owns it rather than in the theme layer: retry
 * policy is a data-layer decision, and it is the only reason the theme layer
 * would need to know the HTTP layer exists.
 */
export function buildQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          error instanceof ApiError && error.status < 500 ? false : failureCount < 2,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
