/**
 * Contract mirrors of the backend `/v1/agencies/:agencyCode/website*` DTOs
 * (see `backend/src/website/website.types.ts`). Free-form JSON is kept
 * `Record<string, unknown>` exactly as the API returns it; the dashboard forms
 * validate against the same shapes with `schemas/website.schema.ts`.
 */

export interface WebsiteAggregate {
  slug: string;
  locale: string;
  themeId: string | null;
  themeSettings: Record<string, unknown>;
  content: Record<string, unknown>;
  branding: Record<string, unknown>;
  navigation: Array<Record<string, unknown>>;
  footer: Record<string, unknown>;
  /** ISO stamp of the last publish; `null` while unpublished (draft rows). */
  publishedAt: string | null;
  updatedAt: string;
}

export type WebsiteDraftResponse = WebsiteAggregate;
export type WebsitePublishedResponse = WebsiteAggregate;

/** Minimal card for the featured-tour picker (published tours only). */
export interface TourCatalogItem {
  code: string;
  name: string;
  coverImageUrl: string | null;
  shortDescription: string | null;
}

export interface WebsitePreviewResponse {
  previewUrl: string;
}

/** Body sent to `PATCH /website/draft/content` (strict, content keys only). */
export interface WebsiteContentPatchPayload {
  locale?: string;
  content?: Record<string, unknown>;
  branding?: Record<string, unknown>;
  navigation?: Array<Record<string, unknown>>;
  footer?: Record<string, unknown>;
}

/** Body sent to `PATCH /website/draft/theme` (strict, theme keys only). */
export interface WebsiteThemePatchPayload {
  themeId?: string | null;
  themeSettings?: Record<string, unknown>;
}

/** Error code the backend emits on `POST /website/publish` slug collisions. */
export const WEBSITE_SLUG_CONFLICT = 'WEBSITE_SLUG_CONFLICT';
export const WEBSITE_NOT_PUBLISHED = 'WEBSITE_NOT_PUBLISHED';
