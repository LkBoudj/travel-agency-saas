import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { InternalAuthUser } from '../auth/auth-user.js';
import { MeAgenciesService, type MyAgencyResponse } from './me-agencies.service.js';
import { MY_AGENCY_SCHEMA } from './me.swagger.js';

/**
 * The signed-in user's own view of the platform, before any agency is chosen.
 *
 * Authenticated only: these routes exist precisely so a client can find out
 * which agency context it may enter, so they cannot require an agency
 * permission themselves.
 */
@ApiTags('me')
@Controller('me')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired auth cookie' })
export class MeController {
  constructor(private readonly meAgencies: MeAgenciesService) {}

  @Get('agencies')
  @ApiOperation({
    summary: 'Agencies the signed-in user belongs to',
    description:
      'Scoped to the caller: it can only ever describe the caller’s own memberships. ' +
      'Suspended agencies and suspended memberships are included so a client can explain why ' +
      'an agency is unavailable instead of silently hiding it; entering one is still refused by ' +
      'the agency guard. Carries no database ids, roles, permissions or `systemKey` — those ' +
      'come from GET /v1/agencies/:agencyCode/me once an agency is selected.',
  })
  @ApiOkResponse({
    description: 'The caller’s agency memberships',
    schema: { type: 'array', items: MY_AGENCY_SCHEMA },
  })
  agencies(@CurrentUser() user: InternalAuthUser): Promise<MyAgencyResponse[]> {
    return this.meAgencies.listForUser(user.id);
  }
}
