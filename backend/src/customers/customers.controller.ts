import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { CustomersService } from './customers.service.js';
import {
  createCustomerSchema,
  listCustomersQuerySchema,
  updateCustomerSchema,
  type CreateCustomerBody,
  type ListCustomersQuery,
  type UpdateCustomerBody,
} from './customers.schemas.js';
import {
  CREATE_CUSTOMER_BODY_SCHEMA,
  CUSTOMER_CODE_PARAM_DOC,
  CUSTOMER_SCHEMA,
  UPDATE_CUSTOMER_BODY_SCHEMA,
} from './customers.swagger.js';
import type { CustomerResponse } from './customers.types.js';

const AGENCY_CODE_PARAM_DOC = {
  name: AGENCY_CODE_PARAM,
  description: 'Agency code',
  example: 'AGY-ABCDEF123456',
};

const AGENCY_NOT_FOUND_DOC = 'Agency not found (AGENCY_NOT_FOUND)';

/**
 * Agency business customers, scoped to the agency in the route.
 *
 * Every route is authorized by an AGENCY `Permission.key` through
 * `AgencyPermissionGuard`, exactly like the other agency-backed features: the
 * agency comes from `:agencyCode`, the caller must hold an ACTIVE membership
 * in an operational agency, and all reads/writes are re-scoped to that same
 * agency inside the service.
 *
 * A customer is NOT an identity: no account, no credentials, no platform link.
 * Archiving (`AGENCY_CUSTOMER_ARCHIVE`) is the deletion equivalent and is
 * one-way for now — there is no restore path.
 */
@ApiTags('customers')
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
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly audit: AuditService,
  ) {}

  @Get('customers')
  @RequireAgencyPermissions('AGENCY_CUSTOMER_VIEW')
  @ApiOperation({
    summary: 'List this agency’s active customers',
    description:
      'Newest first. Optional `search` matches code, name, email or phone (case-insensitive). ' +
      'ARCHIVED customers are excluded from the listing but still readable by code.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Matches code, name, email or phone (case-insensitive)',
    example: 'sara',
  })
  @ApiOkResponse({
    description: 'Active customers of this agency',
    schema: { type: 'array', items: CUSTOMER_SCHEMA },
  })
  list(
    @CurrentAgency() access: AgencyAccessContext,
    @Query({ schema: listCustomersQuerySchema }) query: ListCustomersQuery,
  ): Promise<CustomerResponse[]> {
    return this.customers.list(access.agency.id, query);
  }

  @Get('customers/:customerCode')
  @RequireAgencyPermissions('AGENCY_CUSTOMER_VIEW')
  @ApiOperation({
    summary: 'Get one customer of this agency',
    description:
      'Works for ARCHIVED customers too, so a stored `CUS-...` link keeps working after archiving.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(CUSTOMER_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The requested customer', schema: CUSTOMER_SCHEMA })
  @ApiNotFoundResponse({ description: 'Customer not found in this agency (CUSTOMER_NOT_FOUND)' })
  get(
    @CurrentAgency() access: AgencyAccessContext,
    @Param('customerCode') customerCode: string,
  ): Promise<CustomerResponse> {
    return this.customers.getByCode(access.agency.id, customerCode);
  }

  @Post('customers')
  @RequireAgencyPermissions('AGENCY_CUSTOMER_CREATE')
  @ApiOperation({
    summary: 'Create a customer in this agency',
    description:
      'Every field is optional. The `code` is backend-generated (`CUS-…`) and immutable; the ' +
      'client never supplies it and never sees a database id.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiBody({ schema: CREATE_CUSTOMER_BODY_SCHEMA })
  @ApiCreatedResponse({ description: 'The created customer', schema: CUSTOMER_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation)' })
  async create(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Body({ schema: createCustomerSchema }) dto: CreateCustomerBody,
  ): Promise<CustomerResponse> {
    const customer = await this.customers.create(access.agency.id, dto);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyCustomerCreated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: customer.code,
    });

    return customer;
  }

  @Patch('customers/:customerCode')
  @RequireAgencyPermissions('AGENCY_CUSTOMER_UPDATE')
  @ApiOperation({
    summary: 'Update a customer of this agency',
    description:
      'Omitted fields are left untouched; `null` or an empty string clears one. Archived ' +
      'customers can still be edited.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(CUSTOMER_CODE_PARAM_DOC)
  @ApiBody({ schema: UPDATE_CUSTOMER_BODY_SCHEMA })
  @ApiOkResponse({ description: 'The updated customer', schema: CUSTOMER_SCHEMA })
  @ApiBadRequestResponse({ description: 'Invalid body (schema validation)' })
  @ApiNotFoundResponse({ description: 'Customer not found in this agency (CUSTOMER_NOT_FOUND)' })
  async update(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('customerCode') customerCode: string,
    @Body({ schema: updateCustomerSchema }) dto: UpdateCustomerBody,
  ): Promise<CustomerResponse> {
    const customer = await this.customers.update(access.agency.id, customerCode, dto);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyCustomerUpdated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: customer.code,
    });

    return customer;
  }

  @Patch('customers/:customerCode/archive')
  @RequireAgencyPermissions('AGENCY_CUSTOMER_ARCHIVE')
  @ApiOperation({
    summary: 'Archive a customer of this agency',
    description:
      'One-way soft-delete: the row stays readable by code but leaves the active listing and ' +
      'the given permissions contain no restore path.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(CUSTOMER_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The archived customer', schema: CUSTOMER_SCHEMA })
  @ApiConflictResponse({ description: 'Customer already archived (CUSTOMER_ALREADY_ARCHIVED)' })
  @ApiNotFoundResponse({ description: 'Customer not found in this agency (CUSTOMER_NOT_FOUND)' })
  async archive(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('customerCode') customerCode: string,
  ): Promise<CustomerResponse> {
    const customer = await this.customers.archive(access.agency.id, customerCode);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyCustomerArchived,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: customer.code,
    });

    return customer;
  }
}