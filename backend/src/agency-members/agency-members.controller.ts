import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
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
import {
  AGENCY_CODE_PARAM,
  AgencyPermissionGuard,
} from '../authorization/agency-permission.guard.js';
import { CurrentAgency } from '../authorization/current-agency.decorator.js';
import { RequireAgencyPermissions } from '../authorization/require-agency-permissions.decorator.js';
import type { AgencyAccessContext } from '../authorization/agency-access.js';
import { AgencyMembersService } from './agency-members.service.js';
import { AUDIT_ACTIONS, AuditService } from '../security/audit.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { InternalAuthUser } from '../auth/auth-user.js';
import {
  listAgencyMembersQuerySchema,
  replaceAgencyMemberRolesSchema,
  setAgencyMemberStatusSchema,
  type ListAgencyMembersQuery,
  type ReplaceAgencyMemberRolesBody,
  type SetAgencyMemberStatusBody,
} from './agency-members.schemas.js';
import {
  AGENCY_MEMBER_SCHEMA,
  ASSIGNABLE_ROLE_SCHEMA,
  REPLACE_ROLES_BODY_SCHEMA,
  SET_MEMBER_STATUS_BODY_SCHEMA,
} from './agency-members.swagger.js';
import type {
  AgencyMemberResponse,
  AssignableAgencyRoleResponse,
} from './agency-members.types.js';

const AGENCY_CODE_PARAM_DOC = {
  name: AGENCY_CODE_PARAM,
  description: 'Agency code',
  example: 'AGY-ABCDEF123456',
};

const USER_CODE_PARAM_DOC = {
  name: 'userCode',
  description: "The member's account code",
  example: 'USR-3F2A91C7B4D0',
};

/**
 * Agency member administration, scoped to the agency in the route.
 *
 * Every route is authorized by an AGENCY `Permission.key` through
 * `AgencyPermissionGuard`: the agency comes from `:agencyCode`, the caller must
 * hold an ACTIVE membership in an operational agency, and `membershipType` is
 * never an authorization input — an OWNER is evaluated exactly like an employee.
 *
 * Ownership is out of scope here: the owner appears in the list and can be read,
 * but suspending, removing or re-roling them is rejected. Ownership transfer is
 * a separate future operation.
 *
 * There is deliberately NO way to add a member here. Adding used to accept an
 * arbitrary existing account by code, or create a brand new identity, which made
 * this an agency-side capability over the global AppUser table and let one tenant
 * attach a person who never agreed to it. Both were removed; member invitations
 * will reintroduce joining, with consent, as their own feature.
 */
@ApiTags('agency-members')
@Controller(`agencies/:${AGENCY_CODE_PARAM}`)
@UseGuards(JwtAuthGuard, AgencyPermissionGuard)
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired auth cookie' })
@ApiForbiddenResponse({
  description:
    'The agency is suspended, the caller is not an ACTIVE member, or the required agency ' +
    'permission is missing (AGENCY_PERMISSION_DENIED)',
})
@ApiNotFoundResponse({ description: 'Agency not found (AGENCY_NOT_FOUND)' })
export class AgencyMembersController {
  constructor(
    private readonly members: AgencyMembersService,
    private readonly audit: AuditService,
  ) {}

  @Get('members')
  @RequireAgencyPermissions('AGENCY_MEMBER_VIEW')
  @ApiOperation({
    summary: 'List the members of this agency',
    description:
      'Owner and employees in one list, one row per person however many roles they hold. ' +
      '`accountStatus` is the identity status across the product; `membershipStatus` is access ' +
      'to this agency alone.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Matches name, email or account code (case-insensitive)',
    example: 'ahmed',
  })
  @ApiOkResponse({
    description: 'Members of this agency',
    schema: { type: 'array', items: AGENCY_MEMBER_SCHEMA },
  })
  list(
    @CurrentAgency() access: AgencyAccessContext,
    @Query({ schema: listAgencyMembersQuerySchema }) query: ListAgencyMembersQuery,
  ): Promise<AgencyMemberResponse[]> {
    return this.members.list(access.agency.id, query);
  }

  @Get('available-roles')
  @RequireAgencyPermissions('AGENCY_MEMBER_ROLE_MANAGE')
  @ApiOperation({
    summary: 'Roles that can be assigned in this agency',
    description:
      'Global agency roles plus this agency’s own custom roles. PLATFORM roles and other ' +
      'agencies’ custom roles are never returned, and the protected `systemKey` is not exposed.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiOkResponse({
    description: 'Assignable agency roles',
    schema: { type: 'array', items: ASSIGNABLE_ROLE_SCHEMA },
  })
  availableRoles(
    @CurrentAgency() access: AgencyAccessContext,
  ): Promise<AssignableAgencyRoleResponse[]> {
    return this.members.listAssignableRoles(access.agency.id);
  }

  @Get('members/:userCode')
  @RequireAgencyPermissions('AGENCY_MEMBER_VIEW')
  @ApiOperation({
    summary: 'Get one member of this agency',
    description:
      'Identity plus the membership and roles that belong to THIS agency. Memberships in other ' +
      'agencies, platform roles and password material are never included.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(USER_CODE_PARAM_DOC)
  @ApiOkResponse({ description: 'The requested member', schema: AGENCY_MEMBER_SCHEMA })
  @ApiNotFoundResponse({ description: 'Member not found in this agency (AGENCY_MEMBER_NOT_FOUND)' })
  get(
    @CurrentAgency() access: AgencyAccessContext,
    @Param('userCode') userCode: string,
  ): Promise<AgencyMemberResponse> {
    return this.members.getByUserCode(access.agency.id, userCode);
  }

  @Put('members/:userCode/roles')
  @RequireAgencyPermissions('AGENCY_MEMBER_ROLE_MANAGE')
  @ApiOperation({
    summary: "Replace a member's roles",
    description:
      'Atomic, complete replacement. An empty list is valid and leaves an ACTIVE employee with ' +
      'no business permissions. The owner is rejected: their canonical role is an ownership ' +
      'invariant, not something member management may rewrite.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(USER_CODE_PARAM_DOC)
  @ApiBody({ schema: REPLACE_ROLES_BODY_SCHEMA })
  @ApiOkResponse({ description: 'The member with its new roles', schema: AGENCY_MEMBER_SCHEMA })
  @ApiBadRequestResponse({
    description: 'A role is unknown or not assignable in this agency',
  })
  @ApiConflictResponse({ description: "The owner's roles cannot be changed (OWNER_ROLES_IMMUTABLE)" })
  async replaceRoles(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('userCode') userCode: string,
    @Body({ schema: replaceAgencyMemberRolesSchema }) dto: ReplaceAgencyMemberRolesBody,
  ): Promise<AgencyMemberResponse> {
    const member = await this.members.replaceRoles(access.agency.id, userCode, dto);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyMemberRolesReplaced,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: userCode,
      metadata: { roleKeys: dto.roleKeys },
    });

    return member;
  }

  @Patch('members/:userCode/status')
  @RequireAgencyPermissions('AGENCY_MEMBER_UPDATE')
  @ApiOperation({
    summary: 'Suspend or reactivate a membership',
    description:
      'Affects access to THIS agency only. The account itself stays as it is, memberships in ' +
      'other agencies are untouched, and platform access is unaffected. The owner cannot be ' +
      'suspended.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(USER_CODE_PARAM_DOC)
  @ApiBody({ schema: SET_MEMBER_STATUS_BODY_SCHEMA })
  @ApiOkResponse({ description: 'The member with its new status', schema: AGENCY_MEMBER_SCHEMA })
  @ApiConflictResponse({ description: 'The owner cannot be suspended (OWNER_CANNOT_BE_SUSPENDED)' })
  async setStatus(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('userCode') userCode: string,
    @Body({ schema: setAgencyMemberStatusSchema }) dto: SetAgencyMemberStatusBody,
  ): Promise<AgencyMemberResponse> {
    const member = await this.members.setStatus(access.agency.id, userCode, dto);

    await this.audit.record({
      action:
        dto.status === 'SUSPENDED'
          ? AUDIT_ACTIONS.agencyMemberSuspended
          : AUDIT_ACTIONS.agencyMemberReactivated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: userCode,
    });

    return member;
  }

  @Delete('members/:userCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAgencyPermissions('AGENCY_MEMBER_REMOVE')
  @ApiOperation({
    summary: 'Remove a member from this agency',
    description:
      'Removes the membership and its role assignments from THIS agency only. The account is ' +
      'never deleted, and its memberships in other agencies and its platform access are ' +
      'untouched. The owner cannot be removed.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(USER_CODE_PARAM_DOC)
  @ApiNoContentResponse({ description: 'Membership removed' })
  @ApiConflictResponse({ description: 'The owner cannot be removed (OWNER_CANNOT_BE_REMOVED)' })
  async remove(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('userCode') userCode: string,
  ): Promise<void> {
    await this.members.remove(access.agency.id, userCode);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyMemberRemoved,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      targetCode: userCode,
    });
  }
}
