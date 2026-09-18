import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants.js';
import { PermissionGuard } from '../authorization/permission.guard.js';
import { RequirePermissions } from '../authorization/require-permissions.decorator.js';
import { AppUserLookupService } from './app-user-lookup.service.js';
import { APP_USER_OPTION_SCHEMA } from './agencies.swagger.js';
import type { AppUserOption } from './app-user-lookup.service.js';

export const appUserLookupQuerySchema = z.object({
  search: z.string().trim().min(2).max(100),
});

export type AppUserLookupQuery = z.infer<typeof appUserLookupQuerySchema>;

/**
 * Identity lookup used to pick an agency owner.
 *
 * It is deliberately NOT a user directory: `search` is required (minimum two
 * characters) and results are capped, so the endpoint can only answer "who
 * matches what I typed", never "list everyone".
 *
 * Unlike `/v1/platform-users`, this searches EVERY AppUser, because an agency
 * owner normally holds no platform role at all and would be invisible there.
 * The response carries only what an owner picker needs to show — no password
 * material, no role internals, no database ids.
 *
 * Authorization: `PLATFORM_AGENCY_CREATE`. The lookup exists solely to serve
 * agency creation, so it is scoped to exactly the capability that uses it
 * rather than granting broad visibility over platform user administration.
 */
@ApiTags('agencies')
@Controller('app-users')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired auth cookie' })
@ApiForbiddenResponse({ description: 'Authenticated but missing the required permission' })
export class AppUserLookupController {
  constructor(private readonly lookup: AppUserLookupService) {}

  @Get('search')
  @RequirePermissions('PLATFORM_AGENCY_CREATE')
  @ApiOperation({
    summary: 'Search accounts to select an agency owner',
    description:
      'Matches on first name, last name, email or code (case-insensitive) across every ' +
      'AppUser, not only platform users. Returns a capped list of safe selection data.',
  })
  @ApiQuery({
    name: 'search',
    required: true,
    description: 'At least 2 characters. Matches name, email or code.',
    example: 'ahmed',
  })
  @ApiOkResponse({
    description: 'Matching accounts, active first, then by name',
    schema: { type: 'array', items: APP_USER_OPTION_SCHEMA },
  })
  search(
    @Query({ schema: appUserLookupQuerySchema }) query: AppUserLookupQuery,
  ): Promise<AppUserOption[]> {
    return this.lookup.search(query.search);
  }
}
