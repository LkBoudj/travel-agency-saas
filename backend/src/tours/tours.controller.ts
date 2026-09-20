import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { InternalAuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AgencyAccessContext } from '../authorization/agency-access.js';
import {
  AGENCY_CODE_PARAM,
  AgencyPermissionGuard,
} from '../authorization/agency-permission.guard.js';
import { CurrentAgency } from '../authorization/current-agency.decorator.js';
import { RequireAgencyPermissions } from '../authorization/require-agency-permissions.decorator.js';
import { AUDIT_ACTIONS, AuditService } from '../security/audit.service.js';
import { ToursService } from './tours.service.js';
import {
  createTourSchema,
  listToursQuerySchema,
  updateTourSchema,
  type CreateTourBody,
  type ListToursQuery,
  type UpdateTourBody,
} from './tours.schemas.js';
import {
  TOUR_CODE_PARAM_DOC,
  TOUR_LIST_SCHEMA,
  TOUR_PAYLOAD_BODY_SCHEMA,
  TOUR_SCHEMA,
} from './tours.swagger.js';
import type { TourListResponse, TourResponse } from './tours.types.js';

const AGENCY_CODE_PARAM_DOC = {
  name: AGENCY_CODE_PARAM,
  description: 'Agency code',
  example: 'AGY-ABCDEF123456',
};

const AGENCY_NOT_FOUND_DOC = 'Agency not found (AGENCY_NOT_FOUND)';
const TOUR_NOT_FOUND_DOC = 'Tour not found in this agency (TOUR_NOT_FOUND)';

/**
 * Agency tours, scoped to the agency in the route.
 *
 * Every route is authorized by an AGENCY `Permission.key` through
 * `AgencyPermissionGuard`, like the other agency-backed features: the agency
 * comes from `:agencyCode`, the caller must hold an ACTIVE membership in an
 * operational agency, and all reads/writes are re-scoped to that same agency
 * inside the service. Publishing is explicit and guarded server-side; the
 * backend never auto-publishes.
 */
@ApiTags('tours')
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
export class ToursController {
  constructor(
    private readonly tours: ToursService,
    private readonly audit: AuditService,
  ) {}

  @Get('tours')
  @RequireAgencyPermissions('AGENCY_TOUR_VIEW')
  @ApiOperation({
    summary: 'List this agency’s tours',
    description:
      'Newest first. DRAFT and PUBLISHED tours by default; pass `status` to narrow to one ' +
      'state or to include ARCHIVED. Optional `search` matches code, name, internal ' +
      'reference or a destination (case-insensitive).',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiQuery({ name: 'search', required: false, description: 'Matches code, name, reference or destination' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'One of DRAFT, PUBLISHED, ARCHIVED',
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
  })
  @ApiOkResponse({
    description: 'Tours of this agency',
    schema: { type: 'array', items: TOUR_LIST_SCHEMA },
  })
  list(
    @CurrentAgency() access: AgencyAccessContext,
    @Query({ schema: listToursQuerySchema }) query: ListToursQuery,
  ): Promise<TourListResponse[]> {
    return this.tours.list(access.agency.id, query);
  }

  @Get('tours/:tourCode')
  @RequireAgencyPermissions('AGENCY_TOUR_VIEW')
  @ApiOperation({
    summary: 'Get one tour of this agency',
    description:
      'Works for ARCHIVED tours too, so a stored `TUR-...` link keeps working after archiving.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The requested tour', schema: TOUR_SCHEMA })
  @ApiNotFoundResponse({ description: TOUR_NOT_FOUND_DOC })
  get(
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
  ): Promise<TourResponse> {
    return this.tours.getByCode(access.agency.id, tourCode);
  }

  @Post('tours')
  @RequireAgencyPermissions('AGENCY_TOUR_CREATE')
  @ApiOperation({
    summary: 'Create a tour draft in this agency',
    description:
      'Always lands as DRAFT — the backend never auto-publishes. The `code` is ' +
      'backend-generated (`TUR-…`) and immutable; the client never supplies it and never ' +
      'sees a database id.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiBody({ schema: TOUR_PAYLOAD_BODY_SCHEMA })
  @ApiCreatedResponse({ description: 'The created tour draft', schema: TOUR_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation)' })
  async create(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Body({ schema: createTourSchema }) dto: CreateTourBody,
  ): Promise<TourResponse> {
    const tour = await this.tours.create(access.agency.id, dto);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyTourCreated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: tour.code,
    });

    return tour;
  }

  @Put('tours/:tourCode')
  @RequireAgencyPermissions('AGENCY_TOUR_UPDATE')
  @ApiOperation({
    summary: 'Replace a tour of this agency',
    description:
      'Full aggregate replacement: destinations and itinerary are re-created in the same ' +
      'transaction from the payload. Status is unchanged — it moves only through the ' +
      'publish / unpublish / archive actions. Archived tours can still be edited.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiBody({ schema: TOUR_PAYLOAD_BODY_SCHEMA })
  @ApiOkResponse({ description: 'The updated tour', schema: TOUR_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation)' })
  @ApiNotFoundResponse({ description: TOUR_NOT_FOUND_DOC })
  async update(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
    @Body({ schema: updateTourSchema }) dto: UpdateTourBody,
  ): Promise<TourResponse> {
    const tour = await this.tours.update(access.agency.id, tourCode, dto);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyTourUpdated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: tour.code,
    });

    return tour;
  }

  @Post('tours/:tourCode/publish')
  @HttpCode(HttpStatus.OK)
  @RequireAgencyPermissions('AGENCY_TOUR_PUBLISH')
  @ApiOperation({
    summary: 'Publish a tour of this agency',
    description:
      'Explicit, guarded: the readiness gate runs server-side and the backend never ' +
      'auto-publishes. ON_REQUEST and CUSTOM_QUOTE tours publish once name, a resolved ' +
      'destination, short description and cover image are present. SCHEDULED tours stay ' +
      'blocked until real departures exist (a later module). Pricing is not required yet, ' +
      'and published does not mean bookable. Publishing an already-published tour is a no-op.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The published tour', schema: TOUR_SCHEMA })
  @ApiConflictResponse({
    description:
      'TOUR_PUBLISH_READINESS_BLOCKED (missing Module F pieces, or scheduled without ' +
      'departures) or TOUR_PUBLISH_STATE_BLOCKED (archived tour)',
  })
  @ApiNotFoundResponse({ description: TOUR_NOT_FOUND_DOC })
  async publish(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
  ): Promise<TourResponse> {
    const tour = await this.tours.publish(access.agency.id, tourCode);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyTourPublished,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: tour.code,
    });

    return tour;
  }

  @Post('tours/:tourCode/unpublish')
  @HttpCode(HttpStatus.OK)
  @RequireAgencyPermissions('AGENCY_TOUR_PUBLISH')
  @ApiOperation({
    summary: 'Unpublish a tour of this agency',
    description:
      'PUBLISHED → DRAFT. Unpublishing an already-draft tour is a no-op; an archived one ' +
      'cannot be unpublished.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The unpublished tour', schema: TOUR_SCHEMA })
  @ApiConflictResponse({ description: 'TOUR_PUBLISH_STATE_BLOCKED (archived tour)' })
  @ApiNotFoundResponse({ description: TOUR_NOT_FOUND_DOC })
  async unpublish(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
  ): Promise<TourResponse> {
    const tour = await this.tours.unpublish(access.agency.id, tourCode);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyTourUnpublished,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: tour.code,
    });

    return tour;
  }

  @Patch('tours/:tourCode/archive')
  @RequireAgencyPermissions('AGENCY_TOUR_DELETE')
  @ApiOperation({
    summary: 'Archive a tour of this agency',
    description:
      'One-way soft-delete: the row stays readable by code but leaves the active listing.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The archived tour', schema: TOUR_SCHEMA })
  @ApiConflictResponse({ description: 'Tour already archived (TOUR_ALREADY_ARCHIVED)' })
  @ApiNotFoundResponse({ description: TOUR_NOT_FOUND_DOC })
  async archive(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
  ): Promise<TourResponse> {
    const tour = await this.tours.archive(access.agency.id, tourCode);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyTourArchived,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: tour.code,
    });

    return tour;
  }
}