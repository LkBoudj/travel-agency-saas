import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import {
  requestMintPreview,
  requestPatchDraftContent,
  requestPatchDraftTheme,
  requestPublishedWebsite,
  requestPublishWebsite,
  requestTourCatalog,
  requestWebsiteDraft,
} from '../api/website.api.ts';
import { websiteQueryKeys } from '../queries/website.queries.ts';
import type { WebsiteContentPatchPayload, WebsiteThemePatchPayload } from '../types.ts';

export function useWebsiteDraft(enabled = true) {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: websiteQueryKeys.draft(code),
    queryFn: () => requestWebsiteDraft(code),
    staleTime: 60_000,
    enabled,
  });
}

/**
 * The published website. Unpublished agencies get a `WEBSITE_NOT_PUBLISHED`
 * 404 — callers classify it via `classifyWebsiteError` and treat it as a
 * normal "not published yet" state, not a failure.
 */
export function usePublishedWebsite(enabled = true) {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: websiteQueryKeys.published(code),
    queryFn: () => requestPublishedWebsite(code),
    staleTime: 60_000,
    retry: false,
    enabled,
  });
}

export function useTourCatalog(enabled = true) {
  const { code } = useAgencyContext();
  return useQuery({
    queryKey: websiteQueryKeys.tourCatalog(code),
    queryFn: () => requestTourCatalog(code),
    staleTime: 60_000,
    enabled,
  });
}

export function useWebsiteMutations() {
  const { code } = useAgencyContext();
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: websiteQueryKeys.root(code) });

  const saveContent = useMutation({
    mutationFn: ({ values }: { values: WebsiteContentPatchPayload }) =>
      requestPatchDraftContent(code, values),
    onSuccess: invalidate,
  });

  const saveTheme = useMutation({
    mutationFn: ({ values }: { values: WebsiteThemePatchPayload }) =>
      requestPatchDraftTheme(code, values),
    onSuccess: invalidate,
  });

  const publish = useMutation({
    mutationFn: () => requestPublishWebsite(code),
    onSuccess: invalidate,
  });

  const mintPreview = useMutation({
    mutationFn: ({ page }: { page?: 'home' | 'trips' } = {}) => requestMintPreview(code, page),
  });

  return { saveContent, saveTheme, publish, mintPreview };
}
