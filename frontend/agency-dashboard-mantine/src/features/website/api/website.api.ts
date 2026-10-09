import { apiRequest } from '../../../services/api.ts';
import type {
  TourCatalogItem,
  WebsiteContentPatchPayload,
  WebsiteDraftResponse,
  WebsitePreviewResponse,
  WebsitePublishedResponse,
  WebsiteThemePatchPayload,
} from '../types.ts';

const websitePath = (agencyCode: string) =>
  `/v1/agencies/${encodeURIComponent(agencyCode)}/website`;

export function requestPublishedWebsite(agencyCode: string): Promise<WebsitePublishedResponse> {
  return apiRequest<WebsitePublishedResponse>(websitePath(agencyCode));
}

export function requestWebsiteDraft(agencyCode: string): Promise<WebsiteDraftResponse> {
  return apiRequest<WebsiteDraftResponse>(`${websitePath(agencyCode)}/draft`);
}

export function requestPatchDraftContent(
  agencyCode: string,
  payload: WebsiteContentPatchPayload
): Promise<WebsiteDraftResponse> {
  return apiRequest<WebsiteDraftResponse>(`${websitePath(agencyCode)}/draft/content`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function requestPublishWebsite(agencyCode: string): Promise<WebsitePublishedResponse> {
  return apiRequest<WebsitePublishedResponse>(`${websitePath(agencyCode)}/publish`, {
    method: 'POST',
  });
}

export function requestPatchDraftTheme(
  agencyCode: string,
  payload: WebsiteThemePatchPayload
): Promise<WebsiteDraftResponse> {
  return apiRequest<WebsiteDraftResponse>(`${websitePath(agencyCode)}/draft/theme`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function requestMintPreview(
  agencyCode: string,
  options?: 'home' | 'trips' | { page?: 'home' | 'trips'; themeId?: string }
): Promise<WebsitePreviewResponse> {
  const payload = typeof options === 'string' ? { page: options } : (options ?? {});
  return apiRequest<WebsitePreviewResponse>(`${websitePath(agencyCode)}/preview`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function requestTourCatalog(agencyCode: string): Promise<TourCatalogItem[]> {
  return apiRequest<TourCatalogItem[]>(`${websitePath(agencyCode)}/tour-catalog`);
}
