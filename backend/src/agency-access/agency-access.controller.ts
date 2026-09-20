import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
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
import { AGENCY_CODE_PARAM, AgencyPermissionGuard } from '../authorization/agency-permission.guard.js';
import { CurrentAgency } from '../authorization/current-agency.decorator.js';
import { RequireAgencyMembership } from '../authorization/require-agency-permissions.decorator.js';
import type { AgencyAccessContext } from '../authorization/agency-access.js';
import { AGENCY_ACCESS_SCHEMA } from './agency-access.swagger.js';
import { toAgencyAccessResponse, type AgencyAccessResponse } from './agency-access.serializer.js';

/**
 * Agency-scoped context for the authenticated caller.
 *
 * This is the entry point a future Agency Dashboard calls to establish which
 * agency it is working in and what the signed-in member may do there. The
 * permissions it returns are for shaping the UI only — every agency-side route
 * is guarded independently, and the backend stays authoritative.
 */
@ApiTags('agency-access')
@Controller(`agencies/:${AGENCY_CODE_PARAM}`)
@UseGuards(JwtAuthGuard, AgencyPermissionGuard)
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired auth cookie' })
export class AgencyAccessController {
  @Get('me')
  @RequireAgencyMembership()
  @ApiOperation({
    summary: 'Current agency context for the signed-in member',
    description:
      'Resolves the agency from the route, verifies it is operational and that the caller holds ' +
      'an ACTIVE membership in it, then returns the membership, the AGENCY roles it holds and the ' +
      'effective AGENCY permission keys. Permissions are recomputed from the database on every ' +
      'call, so a role or permission change takes effect without signing in again. Database ids, ' +
      'the protected role `systemKey` and role-permission internals are never exposed.',
  })
  @ApiParam({
    name: AGENCY_CODE_PARAM,
    description: 'Agency code',
    example: 'AGY-ABCDEF123456',
  })
  @ApiOkResponse({ description: 'The caller context in this agency', schema: AGENCY_ACCESS_SCHEMA })
  @ApiForbiddenResponse({
    description:
      'The agency is suspended (AGENCY_SUSPENDED), the caller has no membership ' +
      '(AGENCY_MEMBERSHIP_REQUIRED) or the membership is not active (AGENCY_MEMBERSHIP_INACTIVE)',
  })
  @ApiNotFoundResponse({ description: 'Agency not found (AGENCY_NOT_FOUND)' })
  me(@CurrentAgency() access: AgencyAccessContext): AgencyAccessResponse {
    return toAgencyAccessResponse(access);
  }
}
