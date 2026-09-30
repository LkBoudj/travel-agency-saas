import { Controller, Get, Headers, Param } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { WebsiteService } from './website.service.js';
import { STOREFRONT_DATA_SCHEMA } from './website.swagger.js';
import type { StorefrontDataDto } from './website.types.js';

const SLUG_PARAM_DOC = {
  name: 'slug',
  description: 'Agency website slug (the public tenant key)',
  example: 'demo',
};

/** Extracts the `Authorization: Bearer <token>` value; `undefined` when absent. */
export function bearerToken(authorization: string | undefined): string | undefined {
  if (!authorization) {
    return undefined;
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1] ?? undefined;
}

/**
 * Public read boundary for the storefront edge (T4).
 *
 * Deliberately NOT auth-guarded: it composes the whitelist `StorefrontDataDto`
 * for a tenant's PUBLISHED website. The draft variant is gated by the shared
 * preview token (HMAC, 15-min TTL, slug-bound) — the storefront fetches it
 * server-side for Theme Lab previews only, so the token never reaches a
 * browser.
 */
@ApiTags('website-public')
@Controller('public/website')
export class PublicWebsiteController {
  constructor(private readonly website: WebsiteService) {}

  @Get(':slug')
  @ApiOperation({
    summary: 'Get the published storefront data of a website',
    description:
      'The storefront-shaped publish DTO (see `StorefrontDataDto`) for the agency whose ' +
      'website slug matches. 404 for an unknown slug or a site never published, with the ' +
      'same `WEBSITE_NOT_PUBLISHED` code (no existence oracle).',
  })
  @ApiParam(SLUG_PARAM_DOC)
  @ApiOkResponse({ description: 'The published storefront data', schema: STOREFRONT_DATA_SCHEMA })
  @ApiNotFoundResponse({ description: 'Unknown slug or never published (WEBSITE_NOT_PUBLISHED)' })
  getPublished(@Param('slug') slug: string): Promise<StorefrontDataDto> {
    return this.website.getPublishedStorefront(slug);
  }

  @Get(':slug/draft')
  @ApiOperation({
    summary: 'Get the draft storefront data for a preview',
    description:
      'The draft storefront data (Theme Lab preview). Requires the shared preview token as ' +
      '`Authorization: Bearer <token>`; the token must verify AND its `tenantSlug` claim must ' +
      'match `:slug`. Any failure is a fail-closed 403.',
  })
  @ApiParam(SLUG_PARAM_DOC)
  @ApiOkResponse({ description: 'The draft storefront data', schema: STOREFRONT_DATA_SCHEMA })
  @ApiForbiddenResponse({
    description: 'Missing, invalid, expired or slug-mismatched preview token (WEBSITE_PREVIEW_TOKEN_INVALID)',
  })
  @ApiNotFoundResponse({ description: 'No draft for the slug (WEBSITE_DRAFT_NOT_FOUND)' })
  getDraft(
    @Param('slug') slug: string,
    @Headers('authorization') authorization?: string,
  ): Promise<StorefrontDataDto> {
    return this.website.getDraftStorefront(slug, bearerToken(authorization));
  }
}