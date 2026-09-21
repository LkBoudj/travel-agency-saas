import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiConflictResponse,
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
import { BookingsService } from './bookings.service.js';
import {
  cancelBookingSchema,
  createBookingSchema,
  listBookingsQuerySchema,
  type CancelBookingBody,
  type CreateBookingBody,
  type ListBookingsQuery,
} from './bookings.schemas.js';
import {
  BOOKING_CODE_PARAM_DOC,
  BOOKING_DETAIL_SCHEMA,
  BOOKING_SCHEMA,
  CANCEL_BOOKING_BODY_SCHEMA,
  CREATE_BOOKING_BODY_SCHEMA,
} from './bookings.swagger.js';
import type { BookingDetailResponse, BookingResponse } from './bookings.types.js';

const AGENCY_CODE_PARAM_DOC = {
  name: AGENCY_CODE_PARAM,
  description: 'Agency code',
  example: 'AGY-ABCDEF123456',
};

const AGENCY_NOT_FOUND_DOC = 'Agency not found (AGENCY_NOT_FOUND)';

/**
 * Agency bookings, scoped to the agency in the route.
 *
 * Every route is authorized by an AGENCY `Permission.key` through
 * `AgencyPermissionGuard`, exactly like the other agency-backed features: the
 * agency comes from `:agencyCode`, the caller must hold an ACTIVE membership
 * in an operational agency, and all reads/writes are re-scoped to that same
 * agency inside the service.
 *
 * The client never invents money: creation names a customer, a departure, a
 * seat count and pricing option codes; the backend reads the departure's
 * stored prices, applies each basis, freezes the snapshot and computes the
 * total under a departure row lock that protects capacity.
 */
@ApiTags('bookings')
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
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly audit: AuditService,
  ) {}

  @Get('bookings')
  @RequireAgencyPermissions('AGENCY_BOOKING_VIEW')
  @ApiOperation({
    summary: 'List this agency’s bookings',
    description:
      'Newest first. Optional `status`, `customerCode` and `departureCode` filters, plus a free ' +
      '`search` matching booking code, customer name or tour name (case-insensitive).',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiQuery({ name: 'search', required: false, description: 'Matches code, customer name or tour name' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED'],
    description: 'Restrict to one booking status',
  })
  @ApiQuery({ name: 'customerCode', required: false, description: 'Restrict to one customer' })
  @ApiQuery({ name: 'departureCode', required: false, description: 'Restrict to one departure' })
  @ApiOkResponse({
    description: 'Bookings of this agency',
    schema: { type: 'array', items: BOOKING_SCHEMA },
  })
  list(
    @CurrentAgency() access: AgencyAccessContext,
    @Query({ schema: listBookingsQuerySchema }) query: ListBookingsQuery,
  ): Promise<BookingResponse[]> {
    return this.bookings.list(access.agency.id, query);
  }

  @Get('bookings/:bookingCode')
  @RequireAgencyPermissions('AGENCY_BOOKING_VIEW')
  @ApiOperation({
    summary: 'Get one booking of this agency',
    description:
      'Includes the immutable price-line snapshot and the append-only status history.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(BOOKING_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The requested booking', schema: BOOKING_DETAIL_SCHEMA })
  @ApiNotFoundResponse({ description: 'Booking not found in this agency (BOOKING_NOT_FOUND)' })
  get(
    @CurrentAgency() access: AgencyAccessContext,
    @Param('bookingCode') bookingCode: string,
  ): Promise<BookingDetailResponse> {
    return this.bookings.getByCode(access.agency.id, bookingCode);
  }

  @Post('bookings')
  @RequireAgencyPermissions('AGENCY_BOOKING_CREATE')
  @ApiOperation({
    summary: 'Create a PENDING booking in this agency',
    description:
      'Backend-generated `BKG-…` code, PENDING status, immutable `reservedSeats`, and a total ' +
      'computed server-side from the departure\'s stored prices. Capacity is protected by a ' +
      'departure row lock (`SELECT … FOR UPDATE`), so concurrent bookings cannot oversell. ' +
      'Confirmation is readiness-gated on traveler records and stays unavailable in this module.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiBody({ schema: CREATE_BOOKING_BODY_SCHEMA })
  @ApiCreatedResponse({ description: 'The created booking', schema: BOOKING_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation)' })
  @ApiConflictResponse({
    description:
      'Capacity exhausted, departure not open / deadline passed / started, archived tour, ' +
      'inactive option or mixed currency (BOOKING_…)',
  })
  async create(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Body({ schema: createBookingSchema }) dto: CreateBookingBody,
  ): Promise<BookingResponse> {
    const booking = await this.bookings.create(access.agency.id, dto, actor.code);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyBookingCreated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: booking.code,
      metadata: {
        departureCode: booking.departure.code,
        customerCode: booking.customer.code,
        reservedSeats: booking.reservedSeats,
        totalAmount: booking.totalAmount,
        currency: booking.currency,
      },
    });

    return booking;
  }

  @Post('bookings/:bookingCode/confirm')
  @RequireAgencyPermissions('AGENCY_BOOKING_UPDATE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirm a booking of this agency',
    description:
      'The PENDING → CONFIRMED transition. Confirmation is readiness-gated on the booking\'s ' +
      'Traveler records: the record count must equal the booking\'s immutable reservedSeats ' +
      '(a mismatch is rejected with BOOKING_TRAVELER_COUNT_MISMATCH), so no CONFIRMED booking ' +
      'can exist without a complete traveler manifest.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(BOOKING_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The confirmed booking', schema: BOOKING_SCHEMA })
  @ApiConflictResponse({
    description:
      'Booking already confirmed or cancelled, or the traveler manifest does not match the ' +
      'reserved seats (BOOKING_…).',
  })
  @ApiNotFoundResponse({ description: 'Booking not found in this agency (BOOKING_NOT_FOUND)' })
  async confirm(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('bookingCode') bookingCode: string,
  ): Promise<BookingResponse> {
    const booking = await this.bookings.confirm(access.agency.id, bookingCode, actor.code);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyBookingConfirmed,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: booking.code,
    });

    return booking;
  }

  @Post('bookings/:bookingCode/cancel')
  @RequireAgencyPermissions('AGENCY_BOOKING_CANCEL')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a booking of this agency',
    description:
      'One-way PENDING/CONFIRMED → CANCELLED. Releases the reserved seats under the same ' +
      'departure lock used by creation, records the reason and appends the history entry. ' +
      'A cancelled booking cannot be uncancelled.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(BOOKING_CODE_PARAM_DOC)
  @ApiBody({ schema: CANCEL_BOOKING_BODY_SCHEMA })
  @ApiOkResponse({ description: 'The cancelled booking', schema: BOOKING_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation)' })
  @ApiConflictResponse({ description: 'Booking already cancelled (BOOKING_ALREADY_CANCELLED)' })
  @ApiNotFoundResponse({ description: 'Booking not found in this agency (BOOKING_NOT_FOUND)' })
  async cancel(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('bookingCode') bookingCode: string,
    @Body({ schema: cancelBookingSchema }) dto: CancelBookingBody,
  ): Promise<BookingResponse> {
    const booking = await this.bookings.cancel(access.agency.id, bookingCode, dto, actor.code);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyBookingCancelled,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: booking.code,
      metadata: {
        departureCode: booking.departure.code,
        reason: booking.cancellationReason ?? null,
      },
    });

    return booking;
  }
}