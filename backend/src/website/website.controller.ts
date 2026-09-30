import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { InternalAuthUser } from '../auth/auth-user.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AgencyAccessContext } from '../authorization/agency-access.js';
import {
  AGENCY_CODE_PARAM,
  AgencyPermissionGuard,
} from '../authorization/agency-permission.guard.js';
import { CurrentAgency } from '../authorization/current-agency.decorator.js';
import { RequireAgencyPermissions } from '../authorization/require-agency-permissions.decorator.js';
import { AUDIT_ACTIONS, AuditService } from '../security/audit.service.js';
import {
  websiteContentPatchSchema,
  websitePreviewBodySchema,
  websiteThemePatchSchema,
  type WebsiteContentPatch,
  type WebsitePreviewBody,
  type WebsiteThemePatch,
} from './website.schemas.js';
import { WebsiteService } from './website.service.js';
import {
  WEBSITE_CONTENT_PATCH_BODY_SCHEMA,
  WEBSITE_DRAFT_SCHEMA,
  WEBSITE_PREVIEW_BODY_SCHEMA,
  WEBSITE_PREVIEW_SCHEMA,
  WEBSITE_PUBLISHED_SCHEMA,
  WEBSITE_THEME_PATCH_BODY_SCHEMA,
  WEBSITE_TOUR_CATALOG_SCHEMA,
} from './website.swagger.js';
import type {
  TourCatalogItemResponse,
  WebsiteDraftResponse,
  WebsitePreviewResponse,
  WebsitePublishedResponse,
} from './website.types.js';

const AGENCY_PARAM_DOC = {
  name: AGENCY_CODE_PARAM,
  description: 'Agency code',
  example: 'AGY-ABCDEF123456',
};

const AGENCY_NOT_FOUND_DOC = 'Agency not found (AGENCY_NOT_FOUND)';

/**
 * Agency public website management, scoped to the agency in the route.
 *
 * Every route is guarded by an AGENCY `Permission.key` through
 * `AgencyPermissionGuard`; the agency always comes from `:agencyCode`. Content
 * and theme settings are separate endpoints with separate permissions — a
 * content editor can never touch `themeId`/`themeSettings` and a theme editor
 * can never touch content keys (both patch bodies are strict). Publishing is
 * explicit and guarded; the backend never auto-publishes.
 */
@ApiTags('website')
@Controller(`agencies/:${AGENCY_CODE_PARAM}`)
@UseGuards(JwtAuthGuard, AgencyPermissionGuard)
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired auth cookie' })
@ApiForbiddenResponse({
  description:
    'The agency is suspended, the caller is not an ACTIVE member, or the required agency ' +
    'permission is missing (AGENCY_PERMISSION_DENIED)',
})
@ApiNotFoundResponse({ description: AGENCY_NOT_FOUND_DOC })
export class WebsiteController {
  constructor(
    private readonly website: WebsiteService,
    private readonly audit: AuditService,
  ) {}

  @Get('website')
  @RequireAgencyPermissions('AGENCY_WEBSITE_VIEW')
  @ApiOperation({
    summary: 'Get the published website of this agency',
    description:
      'The published aggregate, or `404 WEBSITE_NOT_PUBLISHED` when the site has never ' +
      'been published.',
  })
  @ApiParam(AGENCY_PARAM_DOC)
  @ApiOkResponse({ description: 'The published website', schema: WEBSITE_PUBLISHED_SCHEMA })
  @ApiNotFoundResponse({ description: 'Not published yet (WEBSITE_NOT_PUBLISHED)' })
  getPublished(@CurrentAgency() access: AgencyAccessContext): Promise<WebsitePublishedResponse> {
    return this.website.getPublished(access.agency.id);
  }

  @Get('website/draft')
  @RequireAgencyPermissions('AGENCY_WEBSITE_VIEW')
  @ApiOperation({
    summary: 'Get the website draft of this agency',
    description:
      'The editable aggregate. The workspace row is created on first access, so the first ' +
      'read already returns a usable draft with defaults.',
  })
  @ApiParam(AGENCY_PARAM_DOC)
  @ApiOkResponse({ description: 'The website draft', schema: WEBSITE_DRAFT_SCHEMA })
  getDraft(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
  ): Promise<WebsiteDraftResponse> {
    return this.website.getDraft(access.agency.id, access.agency.code);
  }

  @Patch('website/draft/content')
  @RequireAgencyPermissions('AGENCY_WEBSITE_CONTENT_EDIT')
  @ApiOperation({
    summary: 'Edit this agency’s website content',
    description:
      'Patches `content`, `branding`, `navigation`, `footer` and/or `locale`. The body is ' +
      'strict: theme keys (`themeId`, `themeSettings`) are rejected outright.',
  })
  @ApiParam(AGENCY_PARAM_DOC)
  @ApiBody({ schema: WEBSITE_CONTENT_PATCH_BODY_SCHEMA })
  @ApiOkResponse({ description: 'The updated draft', schema: WEBSITE_DRAFT_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation)' })
  async updateContent(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Body({ schema: websiteContentPatchSchema }) dto: WebsiteContentPatch,
  ): Promise<WebsiteDraftResponse> {
    const draft = await this.website.updateDraftContent(access.agency.id, access.agency.code, dto);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyWebsiteDraftContentUpdated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
    });

    return draft;
  }

  @Patch('website/draft/theme')
  @RequireAgencyPermissions('AGENCY_WEBSITE_THEME_UPDATE')
  @ApiOperation({
    summary: 'Select and style this agency’s website theme',
    description:
      'Patches `themeId` and/or `themeSettings`. The body is strict: content keys are ' +
      'rejected outright. `themeSettings` is opaque JSON — its schema lives in the theme ' +
      'registry and is validated by the dashboard.',
  })
  @ApiParam(AGENCY_PARAM_DOC)
  @ApiBody({ schema: WEBSITE_THEME_PATCH_BODY_SCHEMA })
  @ApiOkResponse({ description: 'The updated draft', schema: WEBSITE_DRAFT_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation)' })
  async updateTheme(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Body({ schema: websiteThemePatchSchema }) dto: WebsiteThemePatch,
  ): Promise<WebsiteDraftResponse> {
    const draft = await this.website.updateDraftTheme(access.agency.id, access.agency.code, dto);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyWebsiteDraftThemeUpdated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
    });

    return draft;
  }

  @Post('website/publish')
  @HttpCode(HttpStatus.OK)
  @RequireAgencyPermissions('AGENCY_WEBSITE_PUBLISH')
  @ApiOperation({
    summary: 'Publish this agency’s website',
    description:
      'Explicit, guarded action: copies the draft into the published row and stamps ' +
      '`publishedAt` atomically. Never automatic.',
  })
  @ApiParam(AGENCY_PARAM_DOC)
  @ApiOkResponse({ description: 'The published website', schema: WEBSITE_PUBLISHED_SCHEMA })
  @ApiConflictResponse({ description: 'Website slug already used by another tenant (WEBSITE_SLUG_CONFLICT)' })
  async publish(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
  ): Promise<WebsitePublishedResponse> {
    const published = await this.website.publish(access.agency.id, access.agency.code);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyWebsitePublished,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: published.slug,
    });

    return published;
  }

  @Post('website/preview')
  @RequireAgencyPermissions('AGENCY_WEBSITE_VIEW')
  @ApiOperation({
    summary: 'Mint a Theme Lab preview link for the draft',
    description:
      'Returns a signed, short-lived (15 min) storefront preview URL for the draft. The ' +
      'token is signed by the backend with the shared secret — the dashboard never sees it.',
  })
  @ApiParam(AGENCY_PARAM_DOC)
  @ApiBody({ schema: WEBSITE_PREVIEW_BODY_SCHEMA })
  @ApiCreatedResponse({ description: 'The signed preview URL', schema: WEBSITE_PREVIEW_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation)' })
  async preview(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Body({ schema: websitePreviewBodySchema }) dto: WebsitePreviewBody,
  ): Promise<WebsitePreviewResponse> {
    const preview = await this.website.preview(access.agency.id, access.agency.code, dto);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyWebsitePreviewMinted,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
    });

    return preview;
  }

  @Get('website/tour-catalog')
  @RequireAgencyPermissions('AGENCY_WEBSITE_VIEW')
  @ApiOperation({
    summary: 'List published tours for the featured picker',
    description:
      'Minimal cards (code, name, cover, short description) of this agency’s PUBLISHED ' +
      'tours. Deliberately does not require AGENCY_TOUR_VIEW.',
  })
  @ApiParam(AGENCY_PARAM_DOC)
  @ApiOkResponse({ description: 'Published tours', schema: WEBSITE_TOUR_CATALOG_SCHEMA })
  tourCatalog(@CurrentAgency() access: AgencyAccessContext): Promise<TourCatalogItemResponse[]> {
    return this.website.tourCatalog(access.agency.id);
  }
}