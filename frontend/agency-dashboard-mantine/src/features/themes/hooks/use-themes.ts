import { useQuery } from '@tanstack/react-query';
import { requestThemesManifest } from '../api/themes-manifest.api.ts';
import { themesQueryKeys } from '../queries/themes.queries.ts';

/** The theme registry catalog (theme-agency `themes.json`). */
export function useThemesManifest(enabled = true) {
  return useQuery({
    queryKey: themesQueryKeys.manifest(),
    queryFn: () => requestThemesManifest(),
    staleTime: 5 * 60_000,
    enabled,
  });
}
