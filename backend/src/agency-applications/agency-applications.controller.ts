import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { InternalAuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants.js';
import { PermissionGuard } from '../authorization/permission.guard.js';
import { RequirePermissions } from '../authorization/require-permissions.decorator.js';
import type {
  CreateAgencyApplicationBody,
  ListAgencyApplicationsQuery,
  RejectAgencyApplicationBody,
  RequestAgencyApplicationInfoBody,
} from './agency-applications.schemas.js';
import {
  createAgencyApplicationSchema,
  listAgencyApplicationsQuerySchema,
  rejectAgencyApplicationSchema,
  requestAgencyApplicationInfoSchema,
} from './agency-applications.schemas.js';
import { AgencyApplicationsService } from './agency-applications.service.js';
import {
  AGENCY_APPLICATION_EXAMPLE,
  AGENCY_APPLICATION_SCHEMA,
  CREATE_AGENCY_APPLICATION_BODY_SCHEMA,
  LIST_AGENCY_APPLICATIONS_QUERY_SCHEMA,
  REQUEST_INFO_BODY_SCHEMA,
  REJECT_BODY_SCHEMA,
} from './agency-applications.swagger.js';
import type { AgencyApplicationResponse } from './agency-applications.types.js';

const ID_PARAM = {
  name: 'id',
  description: 'Agency application id (opaque string reference)',
  example: AGENCY_APPLICATION_EXAMPLE.id,
};

/**
 * Applicant-facing surface: any authenticated AppUser can submit an agency
 * application and follow its own requests. Applicant identity is always
 * derived from the JWT; no applicantUserId is ever accepted from a body.
 */
@ApiTags('agency-applications')
@Controller('agency-applications')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired auth cookie' })
@ApiForbiddenResponse({ description: 'Authenticated but missing the required permission' })
export class AgencyApplicationsController {
  constructor(private readonly agencyApplicationsService: AgencyApplicationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Submit an agency application',
    description:
      'Creates a PENDING agency application for the authenticated user. The applicant ' +
      'identity comes from the JWT; the applicant is not an agency member until the ' +
      'application is approved by the platform.',
  })
  @ApiBody({ schema: CREATE_AGENCY_APPLICATION_BODY_SCHEMA })
  @ApiCreatedResponse({
    description: 'Application created with status PENDING',
    schema: AGENCY_APPLICATION_SCHEMA,
  })
  @ApiBadRequestResponse({ description: 'Invalid application payload' })
  create(
    @Body({ schema: createAgencyApplicationSchema }) dto: CreateAgencyApplicationBody,
    @CurrentUser() currentUser: InternalAuthUser,
  ): Promise<AgencyApplicationResponse> {
    return this.agencyApplicationsService.create(BigInt(currentUser.id), dto);
  }

  @Get('mine')
  @ApiOperation({
    summary: 'List the authenticated user\u2019s own agency applications',
    description: 'Returns only applications submitted by the authenticated user, newest first.',
  })
  @ApiOkResponse({
    description: 'The user\u2019s own applications, newest first',
    schema: { type: 'array', items: AGENCY_APPLICATION_SCHEMA },
  })
  listMine(@CurrentUser() currentUser: InternalAuthUser): Promise<AgencyApplicationResponse[]> {
    return this.agencyApplicationsService.listMine(BigInt(currentUser.id));
  }

  @Post(':id/withdraw')
  @ApiOperation({
    summary: 'Withdraw one of the authenticated user\u2019s own applications',
    description:
      'Only a PENDING or NEEDS_INFO application can be withdrawn. Decided applications ' +
      'are permanent audit records.',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ description: 'Application withdrawn', schema: AGENCY_APPLICATION_SCHEMA })
  @ApiNotFoundResponse({ description: 'Application not found (or not owned by the caller)' })
  @ApiConflictResponse({ description: 'Application has already been decided' })
  withdraw(
    @Param('id') id: string,
    @CurrentUser() currentUser: InternalAuthUser,
  ): Promise<AgencyApplicationResponse> {
    return this.agencyApplicationsService.withdraw(BigInt(currentUser.id), id);
  }
}

/**
 * Platform review surface. Every action is guarded by a code-owned PLATFORM
 * permission; privileged values (status transitions, reviewer identity,
 * created agency) are always determined by the backend.
 */
@ApiTags('admin/agency-applications')
@Controller('admin/agency-applications')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired auth cookie' })
@ApiForbiddenResponse({ description: 'Authenticated but missing the required permission' })
export class AdminAgencyApplicationsController {
  constructor(private readonly agencyApplicationsService: AgencyApplicationsService) {}

  @Get()
  @RequirePermissions('PLATFORM_AGENCY_APPLICATION_VIEW')
  @ApiOperation({ summary: 'List agency applications for review' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'NEEDS_INFO', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
    description: 'Filter by application status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Matches agency name, applicant email or applicant name (case-insensitive)',
    example: 'sunshine',
  })
  @ApiOkResponse({
    description: 'Applications matching the filters, newest first',
    schema: { type: 'array', items: AGENCY_APPLICATION_SCHEMA },
  })
  list(
    @Query({ schema: listAgencyApplicationsQuerySchema }) query: ListAgencyApplicationsQuery,
  ): Promise<AgencyApplicationResponse[]> {
    return this.agencyApplicationsService.list(query);
  }

  @Get(':id')
  @RequirePermissions('PLATFORM_AGENCY_APPLICATION_VIEW')
  @ApiOperation({ summary: 'Get a single agency application' })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({ description: 'The requested application', schema: AGENCY_APPLICATION_SCHEMA })
  @ApiNotFoundResponse({ description: 'Application not found' })
  getById(@Param('id') id: string): Promise<AgencyApplicationResponse> {
    return this.agencyApplicationsService.getById(id);
  }

  @Patch(':id/needs-info')
  @RequirePermissions('PLATFORM_AGENCY_APPLICATION_VIEW')
  @ApiOperation({
    summary: 'Request more information for an application',
    description:
      'Moves a PENDING application to NEEDS_INFO. NEEDS_INFO is application-management ' +
      'housekeeping (not an approval outcome), so it reuses the application view permission ' +
      'per the platform permission catalog. Approve/reject remain dedicated permissions.',
  })
  @ApiParam(ID_PARAM)
  @ApiBody({ schema: REQUEST_INFO_BODY_SCHEMA })
  @ApiOkResponse({ description: 'Application marked NEEDS_INFO', schema: AGENCY_APPLICATION_SCHEMA })
  @ApiNotFoundResponse({ description: 'Application not found' })
  @ApiConflictResponse({ description: 'Application has already been decided' })
  requestInfo(
    @Param('id') id: string,
    @Body({ schema: requestAgencyApplicationInfoSchema }) dto: RequestAgencyApplicationInfoBody,
    @CurrentUser() currentUser: InternalAuthUser,
  ): Promise<AgencyApplicationResponse> {
    return this.agencyApplicationsService.requestInfo(id, dto, currentUser.id);
  }

  @Patch(':id/reject')
  @RequirePermissions('PLATFORM_AGENCY_APPLICATION_REJECT')
  @ApiOperation({
    summary: 'Reject an application',
    description: 'Rejects a PENDING or NEEDS_INFO application with a reason. The application ' +
      'is kept as a permanent audit record.',
  })
  @ApiParam(ID_PARAM)
  @ApiBody({ schema: REJECT_BODY_SCHEMA })
  @ApiOkResponse({ description: 'Application rejected', schema: AGENCY_APPLICATION_SCHEMA })
  @ApiNotFoundResponse({ description: 'Application not found' })
  @ApiConflictResponse({ description: 'Application has already been decided' })
  reject(
    @Param('id') id: string,
    @Body({ schema: rejectAgencyApplicationSchema }) dto: RejectAgencyApplicationBody,
    @CurrentUser() currentUser: InternalAuthUser,
  ): Promise<AgencyApplicationResponse> {
    return this.agencyApplicationsService.reject(id, dto, currentUser.id);
  }

  @Post(':id/approve')
  @RequirePermissions('PLATFORM_AGENCY_APPLICATION_APPROVE')
  @ApiOperation({
    summary: 'Approve an application and provision the agency (atomic)',
    description:
      'In one transaction: verifies eligibility, creates the Agency, creates the applicant\u2019s ' +
      'AgencyMembership, assigns the global AGENCY_OWNER role and marks the application APPROVED ' +
      'with the approving admin and the created agency linked. If any step fails, everything is ' +
      'rolled back. The same application can never create two agencies.',
  })
  @ApiParam(ID_PARAM)
  @ApiOkResponse({
    description: 'Application approved; agency and owner membership created',
    schema: AGENCY_APPLICATION_SCHEMA,
  })
  @ApiNotFoundResponse({ description: 'Application not found' })
  @ApiConflictResponse({ description: 'Application has already been decided' })
  @ApiBadRequestResponse({
    description: 'The global AGENCY_OWNER role is missing (AGENCY_OWNER_ROLE_MISSING)',
  })
  approve(
    @Param('id') id: string,
    @CurrentUser() currentUser: InternalAuthUser,
  ): Promise<AgencyApplicationResponse> {
    return this.agencyApplicationsService.approve(id, currentUser.id);
  }
}
