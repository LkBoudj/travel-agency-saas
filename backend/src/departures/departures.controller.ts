import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
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
import { DeparturesService } from './departures.service.js';
import {
  createDepartureSchema,
  listDeparturesQuerySchema,
  updateDepartureSchema,
  type CreateDepartureBody,
  type ListDeparturesQuery,
  type UpdateDepartureBody,
} from './departures.schemas.js';
import {
  DEPARTURE_CODE_PARAM_DOC,
  DEPARTURE_PAYLOAD_BODY_SCHEMA,
  DEPARTURE_SCHEMA,
  DEPARTURE_UPDATE_BODY_SCHEMA,
  TOUR_CODE_PARAM_DOC,
} from './departures.swagger.js';
import type { DepartureResponse } from './departures.types.js';

const AGENCY_CODE_PARAM_DOC = {
  name: AGENCY_CODE_PARAM,
  description: 'Agency code',
  example: 'AGY-ABCDEF123456',
};

const AGENCY_NOT_FOUND_DOC = 'Agency not found (AGENCY_NOT_FOUND)';
const TOUR_NOT_FOUND_DOC = 'Tour not found in this agency (TOUR_NOT_FOUND)';
const DEPARTURE_NOT_FOUND_DOC = 'Departure not found on this tour (DEPARTURE_NOT_FOUND)';

/**
 * Agency departures, scoped to the tour in the route.
 *
 * Every route is authorized by an AGENCY `Permission.key` through
 * `AgencyPermissionGuard`, like every other agency-backed feature: the agency
 * comes from `:agencyCode`, the caller must hold an ACTIVE membership in an
 * operational agency, and all reads/writes are re-scoped to that same agency's
 * tour inside the service. Creating or cancelling a departure NEVER changes
 * the tour status implicitly.
 */
@ApiTags('departures')
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
export class DeparturesController {
  constructor(
    private readonly departures: DeparturesService,
    private readonly audit: AuditService,
  ) {}

  @Get('tours/:tourCode/departures')
  @RequireAgencyPermissions('AGENCY_DEPARTURE_VIEW')
  @ApiOperation({
    summary: 'List the departures of one of this agency’s tours',
    description:
      'Newest first. Pass `status` to narrow to one lifecycle state. The tour must belong ' +
      'to the route agency.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'One of OPEN, CLOSED, CANCELLED',
    enum: ['OPEN', 'CLOSED', 'CANCELLED'],
  })
  @ApiOkResponse({
    description: 'Departures of this tour',
    schema: { type: 'array', items: DEPARTURE_SCHEMA },
  })
  @ApiNotFoundResponse({ description: TOUR_NOT_FOUND_DOC })
  list(
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
    @Query({ schema: listDeparturesQuerySchema }) query: ListDeparturesQuery,
  ): Promise<DepartureResponse[]> {
    return this.departures.list(access.agency.id, tourCode, query);
  }

  @Get('tours/:tourCode/departures/:departureCode')
  @RequireAgencyPermissions('AGENCY_DEPARTURE_VIEW')
  @ApiOperation({
    summary: 'Get one departure of this tour',
    description:
      'Returns cancelled departures too, so stored `DEP-...` links keep working after cancellation.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiParam(DEPARTURE_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The requested departure', schema: DEPARTURE_SCHEMA })
  @ApiNotFoundResponse({ description: `${TOUR_NOT_FOUND_DOC}; or ${DEPARTURE_NOT_FOUND_DOC}` })
  get(
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
    @Param('departureCode') departureCode: string,
  ): Promise<DepartureResponse> {
    return this.departures.getByCode(access.agency.id, tourCode, departureCode);
  }

  @Post('tours/:tourCode/departures')
  @RequireAgencyPermissions('AGENCY_DEPARTURE_CREATE')
  @ApiOperation({
    summary: 'Create a departure for one of this agency’s tours',
    description:
      'Always lands as OPEN — status is never accepted and the backend never ' +
      'auto-publishes. The `code` is backend-generated (`DEP-…`), immutable, and ' +
      'the client never supplies it or sees a database id. Creating a departure ' +
      'does not change the tour status.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiBody({ schema: DEPARTURE_PAYLOAD_BODY_SCHEMA })
  @ApiCreatedResponse({ description: 'The created departure', schema: DEPARTURE_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation, incl. date rules)' })
  @ApiNotFoundResponse({ description: TOUR_NOT_FOUND_DOC })
  async create(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
    @Body({ schema: createDepartureSchema }) dto: CreateDepartureBody,
  ): Promise<DepartureResponse> {
    const departure = await this.departures.create(access.agency.id, tourCode, dto);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyDepartureCreated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: departure.code,
      metadata: { tourCode },
    });

    return departure;
  }

  @Put('tours/:tourCode/departures/:departureCode')
  @RequireAgencyPermissions('AGENCY_DEPARTURE_UPDATE')
  @ApiOperation({
    summary: 'Replace a departure of this tour',
    description:
      'Full replacement of the operational fields; `status` may move between OPEN and ' +
      'CLOSED only. A cancelled departure cannot be edited. Capacity cannot be reduced ' +
      'below the seats already reserved by active bookings. The tour status is never ' +
      'touched by this action.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiParam(DEPARTURE_CODE_PARAM_DOC)
  @ApiBody({ schema: DEPARTURE_UPDATE_BODY_SCHEMA })
  @ApiOkResponse({ description: 'The updated departure', schema: DEPARTURE_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation, incl. date rules)' })
  @ApiNotFoundResponse({ description: `${TOUR_NOT_FOUND_DOC}; or ${DEPARTURE_NOT_FOUND_DOC}` })
  @ApiConflictResponse({
    description:
      'Departure is cancelled and cannot be edited (DEPARTURE_ALREADY_CANCELLED), or capacity ' +
      'cannot drop below reserved seats (DEPARTURE_CAPACITY_BELOW_RESERVED)',
  })
  async update(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
    @Param('departureCode') departureCode: string,
    @Body({ schema: updateDepartureSchema }) dto: UpdateDepartureBody,
  ): Promise<DepartureResponse> {
    const departure = await this.departures.update(
      access.agency.id,
      tourCode,
      departureCode,
      dto,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyDepartureUpdated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: departure.code,
      metadata: { tourCode },
    });

    return departure;
  }

  @Post('tours/:tourCode/departures/:departureCode/cancel')
  @HttpCode(HttpStatus.OK)
  @RequireAgencyPermissions('AGENCY_DEPARTURE_DELETE')
  @ApiOperation({
    summary: 'Cancel a departure of this tour',
    description:
      'One-way terminal action (like archiving a tour): status becomes CANCELLED and the row ' +
      'stays readable by code. A departure with active bookings (PENDING/CONFIRMED reserved ' +
      'seats) cannot be cancelled — its bookings must be cancelled first. Cancelling a ' +
      'departure NEVER changes the tour status silently — a PUBLISHED SCHEDULED tour that ' +
      'loses its last OPEN departure stays PUBLISHED and a later publish attempt still runs ' +
      'the normal readiness gate.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiParam(DEPARTURE_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The cancelled departure', schema: DEPARTURE_SCHEMA })
  @ApiNotFoundResponse({ description: `${TOUR_NOT_FOUND_DOC}; or ${DEPARTURE_NOT_FOUND_DOC}` })
  @ApiConflictResponse({
    description:
      'Departure already cancelled (DEPARTURE_ALREADY_CANCELLED), or active bookings still ' +
      'reserve seats (DEPARTURE_HAS_ACTIVE_BOOKINGS)',
  })
  async cancel(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
    @Param('departureCode') departureCode: string,
  ): Promise<DepartureResponse> {
    const { departure, tourStatus, remainingOpenDepartures } =
      await this.departures.cancel(access.agency.id, tourCode, departureCode);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyDepartureCancelled,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: departure.code,
      metadata: { tourCode, tourStatus, remainingOpenDepartures },
    });

    return departure;
  }
}