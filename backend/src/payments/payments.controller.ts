import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
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
import { PaymentsService } from './payments.service.js';
import {
  recordPaymentSchema,
  type RecordPaymentBody,
} from './payments.schemas.js';
import { toDecimal, type PaymentLedgerResponse } from './payments.types.js';
import {
  BOOKING_CODE_PARAM_DOC,
  PAYMENT_LEDGER_SCHEMA,
  RECORD_PAYMENT_BODY_SCHEMA,
} from './payments.swagger.js';

const AGENCY_CODE_PARAM_DOC = {
  name: AGENCY_CODE_PARAM,
  description: 'Agency code',
  example: 'AGY-ABCDEF123456',
};

const AGENCY_NOT_FOUND_DOC = 'Agency not found (AGENCY_NOT_FOUND)';

/**
 * The manual payment ledger of one booking, scoped to the agency in the route.
 *
 * Every route is authorized by an AGENCY `Permission.key` through
 * `AgencyPermissionGuard`, exactly like the other agency-backed features. A
 * payment resolves through its booking (`:agencyCode` + `:bookingCode`), so
 * tenancy never comes from the body.
 *
 * There is no external payment gateway in the MVP: an agency records money it
 * actually received. The client never sends a total, a paid amount or a
 * remaining balance — those are derived server-side from the booking's frozen
 * total and the sum of its ledger, and both this module and the database
 * refuse an edit or a deletion of a recorded payment.
 */
@ApiTags('booking-payments')
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
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly audit: AuditService,
  ) {}

  @Get('bookings/:bookingCode/payments')
  @RequireAgencyPermissions('AGENCY_PAYMENT_VIEW')
  @ApiOperation({
    summary: 'Get the payment ledger of a booking',
    description:
      'Newest payment first, with `paidAmount` and `remainingAmount` derived server-side as ' +
      '`totalAmount − Σ(payments)`. Readable at any point in the booking lifecycle.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(BOOKING_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The booking payment ledger', schema: PAYMENT_LEDGER_SCHEMA })
  @ApiNotFoundResponse({ description: 'Booking not found in this agency (BOOKING_NOT_FOUND)' })
  ledger(
    @CurrentAgency() access: AgencyAccessContext,
    @Param('bookingCode') bookingCode: string,
  ): Promise<PaymentLedgerResponse> {
    return this.payments.ledger(access.agency.id, bookingCode);
  }

  @Post('bookings/:bookingCode/payments')
  @RequireAgencyPermissions('AGENCY_PAYMENT_RECORD')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Record a manual payment against a booking',
    description:
      'Backend-generated `PAY-…` code. The amount must be strictly positive and must not push ' +
      'the booking past fully paid (PAYMENT_OVERPAYMENT); the check runs under a booking row ' +
      'lock so concurrent payments cannot jointly overpay. The currency is inherited from the ' +
      'booking, and the ledger is append-only — a correction is a new payment, never an edit.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(BOOKING_CODE_PARAM_DOC)
  @ApiBody({ schema: RECORD_PAYMENT_BODY_SCHEMA })
  @ApiCreatedResponse({
    description: 'The booking payment ledger including the recorded payment',
    schema: PAYMENT_LEDGER_SCHEMA,
  })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation)' })
  @ApiConflictResponse({
    description:
      'The payment would overpay the booking (PAYMENT_OVERPAYMENT) or the booking is ' +
      'cancelled (PAYMENT_BOOKING_CANCELLED)',
  })
  @ApiNotFoundResponse({ description: 'Booking not found in this agency (BOOKING_NOT_FOUND)' })
  async record(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('bookingCode') bookingCode: string,
    @Body({ schema: recordPaymentSchema }) dto: RecordPaymentBody,
  ): Promise<PaymentLedgerResponse> {
    const { payment, ledger } = await this.payments.record(
      access.agency.id,
      bookingCode,
      dto,
      actor.code,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyPaymentRecorded,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: payment.code,
      metadata: {
        bookingCode,
        amount: toDecimal(payment.amount).toNumber(),
        currency: ledger.currency,
        remainingAmount: ledger.remainingAmount,
      },
    });

    return ledger;
  }
}