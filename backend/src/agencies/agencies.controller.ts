import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants.js';
import { PermissionGuard } from '../authorization/permission.guard.js';
import { RequirePermissions } from '../authorization/require-permissions.decorator.js';
import type {
  CreateAgencyBody,
  ListAgenciesQuery,
  SetAgencyStatusBody,
  UpdateAgencyBody,
} from './agencies.schemas.js';
import {
  createAgencySchema,
  listAgenciesQuerySchema,
  setAgencyStatusSchema,
  updateAgencySchema,
} from './agencies.schemas.js';
import { AgenciesService } from './agencies.service.js';
import {
  AGENCY_DETAILS_SCHEMA,
  AGENCY_EXAMPLE,
  AGENCY_SCHEMA,
  CREATE_AGENCY_BODY_SCHEMA,
  SET_AGENCY_STATUS_BODY_SCHEMA,
  UPDATE_AGENCY_BODY_SCHEMA,
} from './agencies.swagger.js';
import type { AgencyDetailsResponse, AgencyResponse } from './agencies.types.js';

/**
 * Platform-side agency management. Authorization is PLATFORM-scoped only, from
 * the existing canonical catalog; this slice introduces no new permission and
 * no agency-scoped authorization.
 */
@ApiTags('agencies')
@Controller('agencies')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired auth cookie' })
@ApiForbiddenResponse({ description: 'Authenticated but missing the required permission' })
export class AgenciesController {
  constructor(private readonly agenciesService: AgenciesService) {}

  @Get()
  @RequirePermissions('PLATFORM_AGENCY_VIEW')
  @ApiOperation({
    summary: 'List agencies',
    description:
      'Owner and member count are derived from AgencyMembership on read; the agency row stores ' +
      'no denormalized owner or counters.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Matches agency code, name or country (case-insensitive)',
    example: 'sunshine',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'SUSPENDED'],
    description: 'Filter by agency status',
  })
  @ApiOkResponse({
    description: 'Agencies with their owner and member count, newest first',
    schema: { type: 'array', items: AGENCY_SCHEMA },
  })
  list(
    @Query({ schema: listAgenciesQuerySchema }) query: ListAgenciesQuery,
  ): Promise<AgencyResponse[]> {
    return this.agenciesService.list(query);
  }

  @Get(':code')
  @RequirePermissions('PLATFORM_AGENCY_VIEW')
  @ApiOperation({ summary: 'Get a single agency' })
  @ApiParam({ name: 'code', description: 'Agency code', example: AGENCY_EXAMPLE.code })
  @ApiOkResponse({ description: 'The requested agency', schema: AGENCY_DETAILS_SCHEMA })
  @ApiNotFoundResponse({ description: 'Agency not found (AGENCY_NOT_FOUND)' })
  getByCode(@Param('code') code: string): Promise<AgencyDetailsResponse> {
    return this.agenciesService.getByCode(code);
  }

  @Post()
  @RequirePermissions('PLATFORM_AGENCY_CREATE')
  @ApiOperation({
    summary: 'Create an agency',
    description:
      'Atomically creates the agency, an ACTIVE OWNER membership for the given existing AppUser, ' +
      'and that OWNER\'s canonical AGENCY_ADMIN role assignment. An agency is never created ' +
      'orphaned: if any step fails the whole transaction rolls back. Ownership (OWNER) and ' +
      'authorization (AGENCY_ADMIN) stay separate concepts — an employee may hold AGENCY_ADMIN ' +
      'without owning the agency.',
  })
  @ApiBody({ schema: CREATE_AGENCY_BODY_SCHEMA })
  @ApiCreatedResponse({ description: 'The created agency', schema: AGENCY_DETAILS_SCHEMA })
  @ApiBadRequestResponse({
    description: 'Validation failed, or the canonical AGENCY_ADMIN role is missing from the catalog',
  })
  @ApiNotFoundResponse({ description: 'Owner account not found (OWNER_APP_USER_NOT_FOUND)' })
  @ApiConflictResponse({
    description:
      'The owner account is suspended (OWNER_APP_USER_NOT_ACTIVE), or a NEW owner email is ' +
      'already registered (EMAIL_ALREADY_REGISTERED)',
  })
  create(
    @Body({ schema: createAgencySchema }) dto: CreateAgencyBody,
  ): Promise<AgencyDetailsResponse> {
    return this.agenciesService.create(dto);
  }

  @Patch(':code')
  @RequirePermissions('PLATFORM_AGENCY_UPDATE')
  @ApiOperation({
    summary: 'Update agency details',
    description: 'Descriptive fields only. Status and ownership have their own endpoints.',
  })
  @ApiParam({ name: 'code', description: 'Agency code', example: AGENCY_EXAMPLE.code })
  @ApiBody({ schema: UPDATE_AGENCY_BODY_SCHEMA })
  @ApiOkResponse({ description: 'The updated agency', schema: AGENCY_DETAILS_SCHEMA })
  @ApiBadRequestResponse({ description: 'Validation failed or no field was provided' })
  @ApiNotFoundResponse({ description: 'Agency not found (AGENCY_NOT_FOUND)' })
  update(
    @Param('code') code: string,
    @Body({ schema: updateAgencySchema }) dto: UpdateAgencyBody,
  ): Promise<AgencyDetailsResponse> {
    return this.agenciesService.update(code, dto);
  }

  @Patch(':code/status')
  @RequirePermissions('PLATFORM_AGENCY_STATUS_MANAGE')
  @ApiOperation({
    summary: 'Suspend or reactivate an agency',
    description:
      'Switches the BUSINESS on or off. Membership rows are never touched: the OWNER membership ' +
      'stays ACTIVE while the agency is SUSPENDED, and membership suspension is never used as a ' +
      'substitute for agency suspension.',
  })
  @ApiParam({ name: 'code', description: 'Agency code', example: AGENCY_EXAMPLE.code })
  @ApiBody({ schema: SET_AGENCY_STATUS_BODY_SCHEMA })
  @ApiOkResponse({ description: 'The agency with its new status', schema: AGENCY_DETAILS_SCHEMA })
  @ApiNotFoundResponse({ description: 'Agency not found (AGENCY_NOT_FOUND)' })
  setStatus(
    @Param('code') code: string,
    @Body({ schema: setAgencyStatusSchema }) dto: SetAgencyStatusBody,
  ): Promise<AgencyDetailsResponse> {
    return this.agenciesService.setStatus(code, dto);
  }
}
