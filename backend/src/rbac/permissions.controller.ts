import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../authorization/permission.guard.js';
import { RequirePermissions } from '../authorization/require-permissions.decorator.js';
import { PermissionsService } from './permissions.service.js';
import { PERMISSION_SCHEMA } from './rbac.swagger.js';
import type { PermissionResponse } from './rbac.types.js';

@ApiTags('permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired auth cookie' })
@ApiForbiddenResponse({ description: 'Authenticated but missing the required permission' })
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('PLATFORM_ROLE_VIEW')
  @ApiOperation({
    summary: 'List the code-defined PLATFORM permission catalog',
    description:
      'Permissions are capability definitions owned by application code and synchronized into the database by the RBAC seed. They cannot be created, updated or deleted through the API, and this endpoint only exposes PLATFORM-scoped permissions.',
  })
  @ApiOkResponse({
    description: 'The PLATFORM permission catalog stored in the database',
    schema: { type: 'array', items: PERMISSION_SCHEMA },
  })
  list(): Promise<PermissionResponse[]> {
    return this.permissionsService.list();
  }
}