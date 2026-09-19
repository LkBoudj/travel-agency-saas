import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  AGENCY_CODE_PARAM,
  AgencyPermissionGuard,
} from '../authorization/agency-permission.guard.js';
import { CurrentAgency } from '../authorization/current-agency.decorator.js';
import { RequireAgencyPermissions } from '../authorization/require-agency-permissions.decorator.js';
import type { AgencyAccessContext } from '../authorization/agency-access.js';
import { RateLimit, RateLimitGuard } from '../security/rate-limit.guard.js';
import { AUDIT_ACTIONS, AuditService } from '../security/audit.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { InternalAuthUser } from '../auth/auth-user.js';
import { MemberInvitationsService } from './member-invitations.service.js';
import { OptionalJwtResolver } from './optional-auth.js';
import type {
  AcceptMemberInvitationBody,
  CreateMemberInvitationBody,
  ListMemberInvitationsQuery,
} from './member-invitations.schemas.js';
import {
  acceptMemberInvitationSchema,
  createMemberInvitationSchema,
  listMemberInvitationsQuerySchema,
} from './member-invitations.schemas.js';
import {
  ACCEPT_MEMBER_INVITATION_BODY_SCHEMA,
  CREATE_MEMBER_INVITATION_BODY_SCHEMA,
  MEMBER_INVITATION_SCHEMA,
  MEMBER_INVITATION_INSPECT_SCHEMA,
  MEMBER_INVITATION_ACCEPT_SCHEMA,
} from './member-invitations.swagger.js';
import type {
  MemberInvitationResponse,
  MemberInvitationInspectResponse,
  MemberInvitationAcceptResponse,
} from './member-invitations.types.js';

const AGENCY_CODE_PARAM_DOC = {
  name: AGENCY_CODE_PARAM,
  description: 'Agency code',
  example: 'AGY-ABCDEF123456',
};

const INVITATION_CODE_PARAM_DOC = {
  name: 'invitationCode',
  description: 'The invitation code, e.g. INV-3F2A91C7B4D0',
  example: 'INV-3F2A91C7B4D0',
};

const TOKEN_PARAM_DOC = {
  name: 'token',
  description: 'The secret redemption token sent to the invited email address',
  example: 'EjRWeHb9...43-char-base64url',
};

/**
 * Agency-side member-invitation surface.
 *
 * Guarded exactly like member administration: the agency comes from the route,
 * the caller must hold an ACTIVE membership in an operational agency, and the
 * required AGENCY permission decides the action (`AGENCY_MEMBER_INVITE` to
 * create/revoke, `AGENCY_MEMBER_VIEW` to list). `membershipType` is never a
 * factor — an OWNER passes the same checks as an employee.
 *
 * Invitations replace the removed direct member provisioning: an inviter never
 * resolves an account or asserts "existing/new", only an email. Creating is
 * idempotent per outstanding pending invitation.
 */
@ApiTags('agency-member-invitations')
@Controller(`agencies/:${AGENCY_CODE_PARAM}/member-invitations`)
@UseGuards(JwtAuthGuard, AgencyPermissionGuard, RateLimitGuard)
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired auth cookie' })
@ApiForbiddenResponse({
  description:
    'The agency is suspended, the caller is not an ACTIVE member, or the required agency ' +
    'permission is missing (AGENCY_PERMISSION_DENIED)',
})
@ApiNotFoundResponse({ description: 'Agency not found (AGENCY_NOT_FOUND)' })
export class AgencyMemberInvitationsController {
  constructor(
    private readonly invitations: MemberInvitationsService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireAgencyPermissions('AGENCY_MEMBER_INVITE')
  @RateLimit({
    scope: 'MEMBER_INVITE_CREATE',
    defaultLimit: 30,
    defaultWindowSeconds: 3600,
    dimensions: ['actor', 'ip'],
  })
  @ApiOperation({
    summary: 'Invite an email address to join this agency',
    description:
      'Creates a PENDING invitation keyed to the EMAIL — never to an account. Unknown, existing, ' +
      'administrator and other-agency addresses all get the same 201 response: no existence or ' +
      'role information is returned. An unexpired PENDING invitation for the same email is ' +
      'returned as-is (idempotent). The redemption token is delivered out-of-band and is never ' +
      'returned in any response.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiBody({ schema: CREATE_MEMBER_INVITATION_BODY_SCHEMA })
  @ApiCreatedResponse({
    description: 'Invitation created (or the existing pending one returned)',
    schema: MEMBER_INVITATION_SCHEMA,
  })
  @ApiBadRequestResponse({
    description:
      'Unknown or unassignable roles (UNKNOWN_AGENCY_ROLE_KEYS / ROLE_NOT_ASSIGNABLE_IN_AGENCY)',
  })
  @ApiConflictResponse({
    description:
      'The address is already a member of this agency (ALREADY_AGENCY_MEMBER), or a concurrent ' +
      'invitation won the race (INVITATION_ALREADY_EXISTS)',
  })
  async create(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Body({ schema: createMemberInvitationSchema }) dto: CreateMemberInvitationBody,
  ): Promise<MemberInvitationResponse> {
    const invitation = await this.invitations.create(BigInt(actor.id), access.agency, dto);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyMemberInvitationCreated,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      sensitiveTarget: dto.email,
      metadata: { roleKeyCount: dto.roleKeys.length },
    });

    return invitation;
  }

  @Get()
  @RequireAgencyPermissions('AGENCY_MEMBER_VIEW')
  @ApiOperation({
    summary: 'List invitations for this agency',
    description:
      'Newest first. A PENDING row that has passed its expiry is eagerly persisted as EXPIRED ' +
      'in the same request and shown that way. No token material and no resolved-account data ' +
      'are ever included.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'],
    description: 'Filter by invitation lifecycle status',
  })
  @ApiOkResponse({
    description: 'Invitations for this agency',
    schema: { type: 'array', items: MEMBER_INVITATION_SCHEMA },
  })
  list(
    @CurrentAgency() access: AgencyAccessContext,
    @Query({ schema: listMemberInvitationsQuerySchema }) query: ListMemberInvitationsQuery,
  ): Promise<MemberInvitationResponse[]> {
    return this.invitations.list(access.agency.id, query);
  }

  @Delete(':invitationCode')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequireAgencyPermissions('AGENCY_MEMBER_INVITE')
  @ApiOperation({
    summary: 'Revoke a pending invitation',
    description:
      'Only a PENDING invitation can be revoked. Revoked/ACCEPTED/expired codes all return the ' +
      'same 404, so an invitation lifecycle cannot be probed through this endpoint.',
  })
  @ApiParam(AGENCY_CODE_PARAM_DOC)
  @ApiParam(INVITATION_CODE_PARAM_DOC)
  @ApiNoContentResponse({ description: 'Invitation revoked' })
  @ApiNotFoundResponse({ description: 'No pending invitation with this code (INVITATION_NOT_FOUND)' })
  async revoke(
    @CurrentUser() actor: InternalAuthUser,
    @CurrentAgency() access: AgencyAccessContext,
    @Param('invitationCode') invitationCode: string,
  ): Promise<void> {
    await this.invitations.revoke(access.agency.id, invitationCode);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyMemberInvitationRevoked,
      outcome: 'SUCCESS',
      actorCode: actor.code,
      agencyCode: access.agency.code,
      // The invited email is not re-read here; the creation event already
      // recorded its hash, and this endpoint answers only with the code.
      metadata: { invitationCode },
    });
  }
}

/**
 * Public token endpoints for the invitee.
 *
 * Deliberately AUTHENTICATION-FREE guards: either the token holder is a new
 * visitor setting a password, or they are signed in and must match the invited
 * email. An optional identity is resolved from the cookie only to decide which
 * case applies; its presence is never required.
 *
 * Rate-limited per IP because these routes are burnable by design: the token is
 * the capability, so throttling slows guessing/redemption abuse without turning
 * the endpoint into an identity oracle.
 */
@ApiTags('member-invitations')
@Controller('member-invitations')
@UseGuards(RateLimitGuard)
export class MemberInvitationsController {
  constructor(
    private readonly invitations: MemberInvitationsService,
    private readonly optionalAuth: OptionalJwtResolver,
    private readonly audit: AuditService,
  ) {}

  @Get(':token')
  @RateLimit({
    scope: 'MEMBER_INVITE_INSPECT',
    defaultLimit: 60,
    defaultWindowSeconds: 3600,
    dimensions: ['ip'],
  })
  @ApiOperation({
    summary: 'Inspect an invitation with its redemption token',
    description:
      "The token holder's view: which agency invited them and when it expires. Uniform response " +
      'for every valid token — no email, no roles, no account data. Unknown tokens return 404.',
  })
  @ApiParam(TOKEN_PARAM_DOC)
  @ApiOkResponse({ description: 'Invitation state', schema: MEMBER_INVITATION_INSPECT_SCHEMA })
  @ApiNotFoundResponse({ description: 'Unknown token (INVITATION_NOT_FOUND)' })
  inspect(@Param('token') token: string): Promise<MemberInvitationInspectResponse> {
    return this.invitations.inspect(token);
  }

  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @RateLimit({
    scope: 'MEMBER_INVITE_ACCEPT',
    defaultLimit: 30,
    defaultWindowSeconds: 3600,
    dimensions: ['ip'],
  })
  @ApiOperation({
    summary: 'Accept an invitation and join the agency',
    description:
      'One atomic operation. When the invited email already has an account, the requester must ' +
      'be signed in as that account (401 otherwise, 403 if a different account is signed in). ' +
      'When it has no account, it is created with the provided password — the email always comes ' +
      'from the invitation, never from the request. A token redeems exactly once.',
  })
  @ApiParam(TOKEN_PARAM_DOC)
  @ApiBody({ schema: ACCEPT_MEMBER_INVITATION_BODY_SCHEMA })
  @ApiOkResponse({ description: 'Membership granted', schema: MEMBER_INVITATION_ACCEPT_SCHEMA })
  @ApiUnauthorizedResponse({ description: 'Existing account but not signed in (INVITATION_AUTH_REQUIRED)' })
  @ApiForbiddenResponse({
    description:
      'Signed in as a different account (INVITATION_EMAIL_MISMATCH), suspended account ' +
      '(INVITATION_ACCOUNT_SUSPENDED) or suspended agency (INVITATION_AGENCY_SUSPENDED)',
  })
  @ApiConflictResponse({
    description:
      'Revoked (INVITATION_REVOKED), already accepted (INVITATION_ALREADY_ACCEPTED) or already a ' +
      'member (ALREADY_AGENCY_MEMBER)',
  })
  @ApiGoneResponse({ description: 'Expired (INVITATION_EXPIRED)' })
  @ApiBadRequestResponse({
    description: 'A password is required for a new account (INVITATION_PASSWORD_REQUIRED)',
  })
  @ApiNotFoundResponse({ description: 'Unknown token (INVITATION_NOT_FOUND)' })
  async accept(
    @Req() request: Request,
    @Param('token') token: string,
    @Body({ schema: acceptMemberInvitationSchema }) dto: AcceptMemberInvitationBody,
  ): Promise<MemberInvitationAcceptResponse> {
    const caller = await this.optionalAuth.resolve(request);
    const result = await this.invitations.accept(token, caller, dto);

    await this.audit.record({
      action: AUDIT_ACTIONS.agencyMemberInvitationAccepted,
      outcome: 'SUCCESS',
      actorCode: caller?.code ?? null,
      agencyCode: result.agency.code,
      // The invitee email is intentionally not recorded here; it is unknowable
      // from the URL and the acceptance event carries the agency and actor.
      metadata: { joinType: caller ? 'existing-account' : 'new-account' },
    });

    return result;
  }
}