import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
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
import { PricingService } from './pricing.service.js';
import {
  createPricingOptionSchema,
  replaceDeparturePricesSchema,
  updatePricingOptionSchema,
  type CreatePricingOptionBody,
  type ReplaceDeparturePricesBody,
  type UpdatePricingOptionBody,
} from './pricing.schemas.js';
import {
  DEPARTURE_CODE_PARAM_DOC,
  DEPARTURE_PRICES_BODY_SCHEMA,
  DEPARTURE_PRICE_SET_SCHEMA,
  PRICING_OPTION_CODE_PARAM_DOC,
  PRICING_OPTION_PAYLOAD_BODY_SCHEMA,
  PRICING_OPTION_SCHEMA,
  PRICING_OPTION_UPDATE_BODY_SCHEMA,
  TOUR_CODE_PARAM_DOC,
} from './pricing.swagger.js';
import type {
  DeparturePriceSetResponse,
  PricingOptionResponse,
  PricingOptionsOverviewResponse,
} from './pricing.types.js';

const AGENCY_CODE_PARAM_DOC = {
  name: AGENCY_CODE_PARAM,
  description: 'Agency code',
  example: 'AGY-ABCDEF123456',
};

const AGENCY_NOT_FOUND_DOC = 'Agency not found (AGENCY_NOT_FOUND)';
const TOUR_NOT_FOUND_DOC = 'Tour not found in this agency (TOUR_NOT_FOUND)';
const OPTION_NOT_FOUND_DOC =
  'Pricing option not found on this tour (PRICING_OPTION_NOT_FOUND)';
const DEPARTURE_NOT_FOUND_DOC =
  'Departure not found on this tour (DEPARTURE_NOT_FOUND)';

/**
 * Agency tour pricing: option definitions and per-departure prices.
 *
 * Every route is authorized by an AGENCY `Permission.key` through
 * `AgencyPermissionGuard`, like every other agency-backed feature: the agency
 * comes from `:agencyCode`, the caller must hold an ACTIVE membership in an
 * operational agency, and all reads/writes are re-scoped to that same agency's
 * tour inside the service. Reads use `AGENCY_PRICING_VIEW`; mutations use
 * `AGENCY_PRICING_MANAGE`.
 */
@ApiTags('pricing')
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
export class PricingController {
  constructor(
    private readonly pricing: PricingService,
    private readonly audit: AuditService,
  ) {}

  @Get('tours/:tourCode/pricing-options')
  @RequireAgencyPermissions('AGENCY_PRICING_VIEW')
  @ApiOperation({
    summary: 'Pricing overview of one of this agency’s tours',
    description:
      'The tour’s pricing options (newest first) plus the derived `startingPrice` and ' +
      '`pricedOpenDepartureCount` — the dashboard renders the pricing section and the ' +
      'readiness panel from this one response.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiOkResponse({
    description: 'The pricing options and derived numbers of this tour',
    schema: {
      type: 'object',
      properties: {
        options: { type: 'array', items: PRICING_OPTION_SCHEMA },
        startingPrice: {
          type: 'number',
          nullable: true,
          description: 'Minimum price among the tour’s OPEN departures, or null when none.',
        },
        pricedOpenDepartureCount: {
          type: 'integer',
          description: 'Distinct OPEN departures carrying at least one price.',
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: TOUR_NOT_FOUND_DOC })
  list(
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
  ): Promise<PricingOptionsOverviewResponse> {
    return this.pricing.listOptionsOverview(access.agency.id, tourCode);
  }

  @Get('tours/:tourCode/pricing-options/:optionCode')
  @RequireAgencyPermissions('AGENCY_PRICING_VIEW')
  @ApiOperation({
    summary: 'Get one pricing option of this tour',
    description:
      'Returns deactivated options too, so stored `PRC-...` links keep working after deactivation.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiParam(PRICING_OPTION_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The requested pricing option', schema: PRICING_OPTION_SCHEMA })
  @ApiNotFoundResponse({ description: `${TOUR_NOT_FOUND_DOC}; or ${OPTION_NOT_FOUND_DOC}` })
  get(
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
    @Param('optionCode') optionCode: string,
  ): Promise<PricingOptionResponse> {
    return this.pricing.getPricingOption(access.agency.id, tourCode, optionCode);
  }

  @Post('tours/:tourCode/pricing-options')
  @RequireAgencyPermissions('AGENCY_PRICING_MANAGE')
  @ApiOperation({
    summary: 'Create a pricing option for one of this agency’s tours',
    description:
      'Always lands as ACTIVE — status is never accepted and there is no delete. The `code` is ' +
      'backend-generated (`PRC-…`), immutable, and the client never supplies it. The tour keeps ' +
      'a single currency: creating an option in a different currency than the tour already uses ' +
      'is a 409.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiBody({ schema: PRICING_OPTION_PAYLOAD_BODY_SCHEMA })
  @ApiCreatedResponse({ description: 'The created pricing option', schema: PRICING_OPTION_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation)' })
  @ApiNotFoundResponse({ description: TOUR_NOT_FOUND_DOC })
  @ApiConflictResponse({
    description:
      'The name already exists on this tour (PRICING_OPTION_NAME_TAKEN) or the currency would ' +
      'mix with the tour’s existing currency (PRICING_CURRENCY_MISMATCH)',
  })
  async create(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
    @Body({ schema: createPricingOptionSchema }) dto: CreatePricingOptionBody,
  ): Promise<PricingOptionResponse> {
    const option = await this.pricing.createPricingOption(
      access.agency.id,
      tourCode,
      dto,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyPricingOptionCreated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: option.code,
      metadata: { tourCode },
    });

    return option;
  }

  @Put('tours/:tourCode/pricing-options/:optionCode')
  @RequireAgencyPermissions('AGENCY_PRICING_MANAGE')
  @ApiOperation({
    summary: 'Replace a pricing option of this tour',
    description:
      'Full replacement of the editable definition (name, description, basis). Currency is ' +
      'immutable after creation and status moves only through the deactivate action. A ' +
      'deactivated option cannot be edited.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiParam(PRICING_OPTION_CODE_PARAM_DOC)
  @ApiBody({ schema: PRICING_OPTION_UPDATE_BODY_SCHEMA })
  @ApiOkResponse({ description: 'The updated pricing option', schema: PRICING_OPTION_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation)' })
  @ApiNotFoundResponse({ description: `${TOUR_NOT_FOUND_DOC}; or ${OPTION_NOT_FOUND_DOC}` })
  @ApiConflictResponse({
    description:
      'The option is deactivated and cannot be edited (PRICING_OPTION_INACTIVE) or the name is ' +
      'taken (PRICING_OPTION_NAME_TAKEN)',
  })
  async update(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
    @Param('optionCode') optionCode: string,
    @Body({ schema: updatePricingOptionSchema }) dto: UpdatePricingOptionBody,
  ): Promise<PricingOptionResponse> {
    const option = await this.pricing.updatePricingOption(
      access.agency.id,
      tourCode,
      optionCode,
      dto,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyPricingOptionUpdated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: option.code,
      metadata: { tourCode },
    });

    return option;
  }

  @Post('tours/:tourCode/pricing-options/:optionCode/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequireAgencyPermissions('AGENCY_PRICING_MANAGE')
  @ApiOperation({
    summary: 'Deactivate a pricing option of this tour',
    description:
      'One-way terminal action (like archiving a tour): the option becomes INACTIVE and stops ' +
      'being offerable on new price sets, while prices already stored on departures stay. There ' +
      'is no hard delete.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiParam(PRICING_OPTION_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The deactivated pricing option', schema: PRICING_OPTION_SCHEMA })
  @ApiNotFoundResponse({ description: `${TOUR_NOT_FOUND_DOC}; or ${OPTION_NOT_FOUND_DOC}` })
  @ApiConflictResponse({
    description: 'Option is already deactivated (PRICING_OPTION_ALREADY_INACTIVE)',
  })
  async deactivate(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
    @Param('optionCode') optionCode: string,
  ): Promise<PricingOptionResponse> {
    const option = await this.pricing.deactivatePricingOption(
      access.agency.id,
      tourCode,
      optionCode,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyPricingOptionDeactivated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: option.code,
      metadata: { tourCode },
    });

    return option;
  }

  @Get('tours/:tourCode/departures/:departureCode/prices')
  @RequireAgencyPermissions('AGENCY_PRICING_VIEW')
  @ApiOperation({
    summary: 'Get the price set of one departure of this tour',
    description:
      'The departure’s stored prices with their option definitions. Returns cancelled departures '
      + 'too; the empty set is `{ departureCode, currency: null, prices: [] }`.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiParam(DEPARTURE_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The price set of this departure', schema: DEPARTURE_PRICE_SET_SCHEMA })
  @ApiNotFoundResponse({ description: `${TOUR_NOT_FOUND_DOC}; or ${DEPARTURE_NOT_FOUND_DOC}` })
  getPrices(
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
    @Param('departureCode') departureCode: string,
  ): Promise<DeparturePriceSetResponse> {
    return this.pricing.getDeparturePrices(access.agency.id, tourCode, departureCode);
  }

  @Put('tours/:tourCode/departures/:departureCode/prices')
  @RequireAgencyPermissions('AGENCY_PRICING_MANAGE')
  @ApiOperation({
    summary: 'Replace the whole price set of one departure',
    description:
      'Replaces the set in one transaction: options omitted from the payload drop out, ones ' +
      'present are (re)created with their amount. Every option code must belong to the same tour ' +
      'and be ACTIVE; a cancelled departure is locked.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(TOUR_CODE_PARAM_DOC)
  @ApiParam(DEPARTURE_CODE_PARAM_DOC)
  @ApiBody({ schema: DEPARTURE_PRICES_BODY_SCHEMA })
  @ApiOkResponse({ description: 'The replaced price set', schema: DEPARTURE_PRICE_SET_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation)' })
  @ApiNotFoundResponse({
    description: `${TOUR_NOT_FOUND_DOC}; or ${DEPARTURE_NOT_FOUND_DOC}; or ${OPTION_NOT_FOUND_DOC}`,
  })
  @ApiConflictResponse({
    description:
      'Departure is cancelled (DEPARTURE_ALREADY_CANCELLED), an option is deactivated ' +
      '(PRICING_OPTION_INACTIVE) or the set would mix currencies (PRICING_CURRENCY_MISMATCH)',
  })
  async replacePrices(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('tourCode') tourCode: string,
    @Param('departureCode') departureCode: string,
    @Body({ schema: replaceDeparturePricesSchema }) dto: ReplaceDeparturePricesBody,
  ): Promise<DeparturePriceSetResponse> {
    const priceSet = await this.pricing.replaceDeparturePrices(
      access.agency.id,
      tourCode,
      departureCode,
      dto,
    );

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyDeparturePricesReplaced,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: departureCode,
      metadata: {
        tourCode,
        optionCount: dto.prices.length,
        currency: priceSet.currency,
      },
    });

    return priceSet;
  }
}