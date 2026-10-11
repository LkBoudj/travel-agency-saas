import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  WEBSITE_DRAFT_NOT_FOUND,
  WEBSITE_NOT_PUBLISHED,
  WEBSITE_PREVIEW_TOKEN_INVALID,
  WEBSITE_SLUG_CONFLICT,
} from './website.error-codes.js';
import { signWebsitePreviewToken, verifyWebsitePreviewToken } from './website-preview.js';
import type {
  WebsiteContentPatch,
  WebsitePreviewBody,
  WebsiteThemePatch,
} from './website.schemas.js';
import {
  composeStorefrontData,
  composeTour,
  pickContent,
  type TourComposeSource,
} from './website-compose.js';
import type {
  StorefrontDataDto,
  TourCatalogItemResponse,
  WebsiteDraftResponse,
  WebsitePreviewResponse,
  WebsitePublishedResponse,
} from './website.types.js';

/** Storefront default theme id when a draft has no theme selected yet. */
const DEFAULT_THEME_ID = 'starter';

/** Default public tenant key for an agency without a bespoke slug. */
function defaultSlug(agencyCode: string): string {
  return agencyCode.toLowerCase();
}

function toDraftResponse(row: {
  slug: string;
  locale: string;
  themeId: string | null;
  themeSettings: Prisma.JsonValue;
  content: Prisma.JsonValue;
  branding: Prisma.JsonValue;
  navigation: Prisma.JsonValue;
  footer: Prisma.JsonValue;
  updatedAt: Date;
}): WebsiteDraftResponse {
  return {
    slug: row.slug,
    locale: row.locale,
    themeId: row.themeId,
    themeSettings: (row.themeSettings as Record<string, unknown>) ?? {},
    content: (row.content as Record<string, unknown>) ?? {},
    branding: (row.branding as Record<string, unknown>) ?? {},
    navigation: Array.isArray(row.navigation)
      ? (row.navigation as Array<Record<string, unknown>>)
      : [],
    footer: (row.footer as Record<string, unknown>) ?? {},
    publishedAt: null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/**
 * Narrows a stored JSON column to the write-input type. Every website JSON
 * column is `NOT NULL` and only object/array values are ever written (the patch
 * schemas reject `null`), so the read type — which also admits a top-level JSON
 * `null` — is safe to reuse verbatim when publishing a copy.
 */
function toJsonInput(value: Prisma.JsonValue): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

/**
 * Agency public website data layer.
 *
 * Tenant isolation mirrors every other agency-owned module: methods take the
 * agency id resolved from the `:agencyCode` route and re-scope every query to
 * it — no method accepts an agency identifier from a request body. The draft
 * is `ensure-once` (first read creates it), `publish()` is explicit and
 * atomic (draft → published copy + `publishedAt` in one statement), and the
 * backend never auto-publishes.
 */
@Injectable()
export class WebsiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async ensureDraft(agencyId: bigint, agencyCode: string) {
    const existing = await this.prisma.agencyWebsiteDraft.findFirst({
      where: { agencyId },
    });
    if (existing) {
      return existing;
    }
    return this.prisma.agencyWebsiteDraft.create({
      data: {
        agencyId,
        slug: defaultSlug(agencyCode),
        locale: 'en',
        themeSettings: {},
        content: {},
        branding: {},
        navigation: [],
        footer: {},
      },
    });
  }

  /** Draft aggregate; ensures the workspace exists first. */
  async getDraft(agencyId: bigint, agencyCode: string): Promise<WebsiteDraftResponse> {
    return toDraftResponse(await this.ensureDraft(agencyId, agencyCode));
  }

  /** Published aggregate; a missing row means the site was never published. */
  async getPublished(agencyId: bigint): Promise<WebsitePublishedResponse> {
    const row = await this.prisma.agencyWebsite.findFirst({ where: { agencyId } });
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Website has not been published yet',
        errorCode: WEBSITE_NOT_PUBLISHED,
      });
    }
    return {
      ...toDraftResponse(row),
      publishedAt: row.publishedAt.toISOString(),
    };
  }

  /** Content-group patch: content, branding, navigation, footer, locale. */
  async updateDraftContent(
    agencyId: bigint,
    agencyCode: string,
    patch: WebsiteContentPatch,
  ): Promise<WebsiteDraftResponse> {
    const draft = await this.ensureDraft(agencyId, agencyCode);

    const current = draft;
    const data: Prisma.AgencyWebsiteDraftUpdateInput = {};
    if (patch.locale !== undefined) data.locale = patch.locale;
    if (patch.content !== undefined) {
      data.content = {
        ...(current.content as Record<string, unknown>),
        ...patch.content,
      } as Prisma.InputJsonValue;
    }
    if (patch.branding !== undefined) {
      data.branding = {
        ...(current.branding as Record<string, unknown>),
        ...patch.branding,
      } as Prisma.InputJsonValue;
    }
    if (patch.navigation !== undefined) {
      data.navigation = patch.navigation as unknown as Prisma.InputJsonValue;
    }
    if (patch.footer !== undefined) {
      data.footer = {
        ...(current.footer as Record<string, unknown>),
        ...patch.footer,
      } as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.agencyWebsiteDraft.update({
      where: { id: current.id },
      data,
    });
    return toDraftResponse(updated);
  }

  /** Theme-group patch: themeId + themeSettings only. */
  async updateDraftTheme(
    agencyId: bigint,
    agencyCode: string,
    patch: WebsiteThemePatch,
  ): Promise<WebsiteDraftResponse> {
    const draft = await this.ensureDraft(agencyId, agencyCode);

    const data: Prisma.AgencyWebsiteDraftUpdateInput = {};
    if (patch.themeId !== undefined) data.themeId = patch.themeId;
    if (patch.themeSettings !== undefined) {
      data.themeSettings = {
        ...(draft.themeSettings as Record<string, unknown>),
        ...patch.themeSettings,
      } as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.agencyWebsiteDraft.update({
      where: { id: draft.id },
      data,
    });
    return toDraftResponse(updated);
  }

  /**
   * Explicit publish: copies the draft into the published row atomically and
   * stamps `publishedAt`. Never automatic — the caller asked. Idempotent for an
   * already-published site. A slug that collides with another tenant's slug is
   * rejected by the deferred cross-table trigger and surfaced as a 409.
   */
  async publish(
    agencyId: bigint,
    agencyCode: string,
  ): Promise<WebsitePublishedResponse> {
    const draft = await this.ensureDraft(agencyId, agencyCode);
    const publishedAt = new Date();
    const copy = {
      slug: draft.slug,
      locale: draft.locale,
      themeId: draft.themeId,
      themeSettings: toJsonInput(draft.themeSettings),
      content: toJsonInput(draft.content),
      branding: toJsonInput(draft.branding),
      navigation: toJsonInput(draft.navigation),
      footer: toJsonInput(draft.footer),
      publishedAt,
    };

    try {
      const published = await this.prisma.agencyWebsite.upsert({
        where: { agencyId },
        create: { agencyId, ...copy },
        update: copy,
      });
      return {
        ...toDraftResponse(published),
        publishedAt: published.publishedAt.toISOString(),
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({
          statusCode: 409,
          message: `Website slug "${draft.slug}" is already used by another tenant`,
          errorCode: WEBSITE_SLUG_CONFLICT,
        });
      }
      throw error;
    }
  }

  /**
   * Mints a signed Theme Lab preview link for the draft. The token carries the
   * draft's slug + theme (default theme before any activation) and is signed
   * with the shared secret — the dashboard browser never sees it.
   */
  async preview(
    agencyId: bigint,
    agencyCode: string,
    body: WebsitePreviewBody,
  ): Promise<WebsitePreviewResponse> {
    const draft = await this.ensureDraft(agencyId, agencyCode);
    const themeId = body.themeId ?? draft.themeId ?? DEFAULT_THEME_ID;
    const secret = this.config.get<string>('PREVIEW_TOKEN_SECRET');
    const base = this.config.get<string>('STOREFRONT_BASE_URL') ?? 'http://localhost:4321';
    const page = body.page ?? 'home';

    const token = signWebsitePreviewToken({ tenantSlug: draft.slug, themeId }, secret ?? '');
    return { previewUrl: `${base}/_lab/${themeId}/${page}?t=${token}` };
  }

  /** Minimal PUBLISHED tour list for the featured picker (no AGENCY_TOUR_VIEW). */
  async tourCatalog(agencyId: bigint): Promise<TourCatalogItemResponse[]> {
    const tours = await this.prisma.tour.findMany({
      where: { agencyId, status: 'PUBLISHED' },
      select: {
        code: true,
        name: true,
        coverImageUrl: true,
        shortDescription: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return tours.map((tour) => ({
      code: tour.code,
      name: tour.name,
      coverImageUrl: tour.coverImageUrl,
      shortDescription: tour.shortDescription,
    }));
  }

  // ---------------------------------------------------------------------------
  // Public read boundary (T4): whitelist `StorefrontDataDto` for the storefront
  // edge. No authentication — the compose is read-only and emits only the
  // storefront contract's fields. The draft variant is gated by the shared
  // preview token (fail-closed 403 on any verification failure).
  // ---------------------------------------------------------------------------

  /** Published storefront data for a tenant slug (404 for unknown/unpublished). */
  async getPublishedStorefront(slug: string): Promise<StorefrontDataDto> {
    const row = await this.prisma.agencyWebsite.findFirst({
      where: { slug },
      include: { agency: { select: { id: true, name: true } } },
    });
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Website has not been published yet',
        errorCode: WEBSITE_NOT_PUBLISHED,
      });
    }
    return this.composeForRow(row, row.agency.id, row.agency.name, row.themeId, false);
  }

  /**
   * Draft storefront data for a tenant slug, gated by the shared preview token.
   * The token's `themeId` claim is honored as the preview theme; any
   * verification failure (format, signature, expiry, slug mismatch) is 403.
   */
  async getDraftStorefront(
    slug: string,
    token: string | null | undefined,
  ): Promise<StorefrontDataDto> {
    const secret = this.config.get<string>('PREVIEW_TOKEN_SECRET') ?? '';
    const claims = verifyWebsitePreviewToken(token, secret);
    if (!claims || claims.tenantSlug !== slug) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Invalid or expired website preview token',
        errorCode: WEBSITE_PREVIEW_TOKEN_INVALID,
      });
    }

    const row = await this.prisma.agencyWebsiteDraft.findFirst({
      where: { slug },
      include: { agency: { select: { id: true, name: true } } },
    });
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Website draft not found',
        errorCode: WEBSITE_DRAFT_NOT_FOUND,
      });
    }
    return this.composeForRow(row, row.agency.id, row.agency.name, claims.themeId, true);
  }

  private async fetchPublishedTours(agencyId: bigint) {
    return this.prisma.tour.findMany({
      where: { agencyId, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      include: {
        destinations: { orderBy: { position: 'asc' } },
        itinerary: { orderBy: { position: 'asc' } },
        departures: {
          where: { status: 'OPEN' },
          select: {
            prices: {
              select: {
                amount: true,
                pricingOption: { select: { currency: true } },
              },
            },
          },
        },
      },
    });
  }

  private toTourSource(
    tour: Awaited<ReturnType<WebsiteService['fetchPublishedTours']>>[number],
  ): TourComposeSource {
    return {
      code: tour.code,
      name: tour.name,
      shortDescription: tour.shortDescription,
      description: tour.description,
      coverImageUrl: tour.coverImageUrl,
      days: tour.days,
      nights: tour.nights,
      hours: tour.hours,
      highlights: tour.highlights,
      included: tour.included,
      notIncluded: tour.notIncluded,
      destinations: tour.destinations.map((d) => ({ place: d.place, locality: d.locality })),
      itinerary: tour.itinerary.map((day) => ({
        position: day.position,
        title: day.title,
        description: day.description,
      })),
      departures: tour.departures.map((departure) => ({
        prices: departure.prices.map((price) => ({
          amount: Number(price.amount),
          currency: price.pricingOption.currency,
        })),
      })),
    };
  }

  private async composeForRow(
    row: {
      slug: string;
      locale: string;
      themeId: string | null;
      themeSettings: Prisma.JsonValue;
      content: Prisma.JsonValue;
      branding: Prisma.JsonValue;
      navigation: Prisma.JsonValue;
      footer: Prisma.JsonValue;
    },
    agencyId: bigint,
    agencyName: string,
    themeIdOverride: string | null,
    isDraft = false,
  ): Promise<StorefrontDataDto> {
    const content = (row.content as Record<string, unknown>) ?? {};
    const featured = new Set(pickContent(content).featuredTourCodes ?? []);
    const tours = (await this.fetchPublishedTours(agencyId)).map((tour) =>
      composeTour(this.toTourSource(tour), featured),
    );

    return composeStorefrontData({
      tenantSlug: row.slug,
      locale: row.locale,
      themeId: themeIdOverride,
      agencyName,
      branding: row.branding,
      navigation: row.navigation,
      footer: row.footer,
      themeSettings: row.themeSettings,
      content,
      tours,
      isDraft,
    });
  }
}