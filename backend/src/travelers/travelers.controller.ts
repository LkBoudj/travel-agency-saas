import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
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
import {
  addTravelerSchema,
  updateTravelerSchema,
  type AddTravelerBody,
  type UpdateTravelerBody,
} from './travelers.schemas.js';
import type { TravelerResponse } from './travelers.types.js';
import {
  ADD_TRAVELER_BODY_SCHEMA,
  BOOKING_CODE_PARAM_DOC,
  TRAVELER_CODE_PARAM_DOC,
  TRAVELER_SCHEMA,
  UPDATE_TRAVELER_BODY_SCHEMA,
} from './travelers.swagger.js';
import { TravelersService } from './travelers.service.js';

const AGENCY_CODE_PARAM_DOC = {
  name: AGENCY_CODE_PARAM,
  description: 'Agency code',
  example: 'AGY-ABCDEF123456',
};

const AGENCY_NOT_FOUND_DOC = 'Agency not found (AGENCY_NOT_FOUND)';

/**
 * Traveler records of one booking, scoped to the agency in the route.
 *
 * Every route is authorized by an AGENCY `Permission.key` through
 * `AgencyPermissionGuard`, exactly like the other agency-backed features. A
 * traveler resolves through its booking (`:agencyCode` + `:bookingCode`), so
 * tenancy never comes from the body. Travelers can be listed at any point in
 * the booking lifecycle; writes are allowed only while the booking is PENDING.
 */
@ApiTags('booking-travelers')
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
export class TravelersController {
  constructor(
    private readonly travelers: TravelersService,
    private readonly audit: AuditService,
  ) {}

  @Get('bookings/:bookingCode/travelers')
  @RequireAgencyPermissions('AGENCY_TRAVELER_VIEW')
  @ApiOperation({
    summary: 'List the traveler records of a booking',
    description:
      'Newest first. Readable at any point in the booking lifecycle; the manifest is frozen ' +
      'once the booking leaves PENDING.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(BOOKING_CODE_PARAM_DOC)
  @ApiOkResponse({
    description: 'Traveler records of the booking',
    schema: { type: 'array', items: TRAVELER_SCHEMA },
  })
  @ApiNotFoundResponse({ description: 'Booking not found in this agency (BOOKING_NOT_FOUND)' })
  list(
    @CurrentAgency() access: AgencyAccessContext,
    @Param('bookingCode') bookingCode: string,
  ): Promise<TravelerResponse[]> {
    return this.travelers.list(access.agency.id, bookingCode);
  }

  @Post('bookings/:bookingCode/travelers')
  @RequireAgencyPermissions('AGENCY_TRAVELER_CREATE')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a traveler to a PENDING booking',
    description:
      'Backend-generated `TRV-…` code. The booking must still be PENDING (later writes are ' +
      'rejected with BOOKING_TRAVELERS_FROZEN) and the manifest can never exceed the booking\u2019s ' +
      'immutable reservedSeats (BOOKING_TRAVELER_LIMIT_REACHED).',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(BOOKING_CODE_PARAM_DOC)
  @ApiBody({ schema: ADD_TRAVELER_BODY_SCHEMA })
  @ApiCreatedResponse({ description: 'The created traveler', schema: TRAVELER_SCHEMA })
  @ApiNotFoundResponse({ description: 'Booking not found in this agency (BOOKING_NOT_FOUND)' })
  async add(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('bookingCode') bookingCode: string,
    @Body({ schema: addTravelerSchema }) dto: AddTravelerBody,
  ): Promise<TravelerResponse> {
    const traveler = await this.travelers.add(access.agency.id, bookingCode, dto);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyTravelerCreated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: traveler.code,
      metadata: { bookingCode },
    });

    return traveler;
  }

  @Patch('bookings/:bookingCode/travelers/:travelerCode')
  @RequireAgencyPermissions('AGENCY_TRAVELER_UPDATE')
  @ApiOperation({
    summary: 'Update a traveler record of a PENDING booking',
    description:
      'Partial update: omitted fields are untouched, explicit null (or blank) clears. The ' +
      'booking must still be PENDING (BOOKING_TRAVELERS_FROZEN) and only travelers on this ' +
      'booking can be targeted (a foreign `TRV-…` code is a 404).',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(BOOKING_CODE_PARAM_DOC)
  @ApiParam(TRAVELER_CODE_PARAM_DOC)
  @ApiBody({ schema: UPDATE_TRAVELER_BODY_SCHEMA })
  @ApiOkResponse({ description: 'The updated traveler', schema: TRAVELER_SCHEMA })
  @ApiNotFoundResponse({
    description: 'Booking not found (BOOKING_NOT_FOUND) or traveler not on this booking (TRAVELER_NOT_FOUND)',
  })
  async update(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('bookingCode') bookingCode: string,
    @Param('travelerCode') travelerCode: string,
    @Body({ schema: updateTravelerSchema }) dto: UpdateTravelerBody,
  ): Promise<TravelerResponse> {
    const traveler = await this.travelers.update(
      access.agency.id,
      bookingCode,
      travelerCode,
      dto,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyTravelerUpdated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: traveler.code,
      metadata: { bookingCode },
    });

    return traveler;
  }
}