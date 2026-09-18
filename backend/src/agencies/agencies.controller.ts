import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
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
import type { ListAgenciesQuery } from './agencies.schemas.js';
import { listAgenciesQuerySchema } from './agencies.schemas.js';
import { AgenciesService } from './agencies.service.js';
import { AGENCY_SCHEMA, AGENCY_EXAMPLE } from './agencies.swagger.js';
import type { AgencyResponse } from './agencies.types.js';

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
  @ApiOperation({ summary: 'List agencies' })
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
    description: 'Agencies with their member counts, newest first',
    schema: { type: 'array', items: AGENCY_SCHEMA },
  })
  list(@Query({ schema: listAgenciesQuerySchema }) query: ListAgenciesQuery): Promise<AgencyResponse[]> {
    return this.agenciesService.list(query);
  }

  @Get(':code')
  @RequirePermissions('PLATFORM_AGENCY_VIEW')
  @ApiOperation({ summary: 'Get a single agency' })
  @ApiParam({ name: 'code', description: 'Agency code', example: AGENCY_EXAMPLE.code })
  @ApiOkResponse({ description: 'The requested agency', schema: AGENCY_SCHEMA })
  @ApiNotFoundResponse({ description: 'Agency not found' })
  getByCode(@Param('code') code: string): Promise<AgencyResponse> {
    return this.agenciesService.getByCode(code);
  }
}
