import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiCookieAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionGuard } from '../authorization/permission.guard.js';
import { RequirePermissions } from '../authorization/require-permissions.decorator.js';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants.js';
import { RolesService } from './roles.service.js';
import type { CreateRoleBody, UpdateRoleBody } from './rbac.schemas.js';
import { createRoleSchema, replaceRolePermissionsSchema, updateRoleSchema } from './rbac.schemas.js';
import { PERMISSION_SCHEMA, ROLE_EXAMPLE, ROLE_SCHEMA } from './rbac.swagger.js';
import type {
  PermissionResponse,
  ReplaceRolePermissionsResponse,
  RoleResponse,
} from './rbac.types.js';

/**
 * Global Agency Roles: `scope=AGENCY` with `agencyId=null`, managed by the
 * Platform Admin. Custom Agency roles (a non-null `agencyId`) are Group 2 and
 * are never exposed here. Endpoint authorization uses the dedicated
 * `PLATFORM_AGENCY_ROLE_*` capabilities; the role's own grantable permissions
 * stay isolated to the AGENCY scope.
 */
@ApiTags('agency-roles')
@Controller('agency-roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired auth cookie' })
@ApiForbiddenResponse({ description: 'Authenticated but missing the required permission' })
export class AgencyRolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('PLATFORM_AGENCY_ROLE_VIEW')
  @ApiOperation({ summary: 'List all Global Agency roles' })
  @ApiOkResponse({
    description: 'All Global Agency roles (scope=AGENCY, agencyId=null)',
    schema: { type: 'array', items: ROLE_SCHEMA },
  })
  list(): Promise<RoleResponse[]> {
    return this.rolesService.list('AGENCY');
  }

  // Declared before `:id` so "available-permissions" is never captured as an id.
  @Get('available-permissions')
  @RequirePermissions('PLATFORM_AGENCY_ROLE_VIEW')
  @ApiOperation({
    summary: 'List the AGENCY permissions available to Global Agency roles',
    description:
      'Returns the code-defined AGENCY permission catalog. It never contains fake or invented permissions and is not editable through the API.',
  })
  @ApiOkResponse({
    description: 'AGENCY permissions that can be attached to a Global Agency role',
    schema: { type: 'array', items: PERMISSION_SCHEMA },
  })
  listAvailablePermissions(): Promise<PermissionResponse[]> {
    return this.rolesService.listAvailablePermissions('AGENCY');
  }

  @Get(':id')
  @RequirePermissions('PLATFORM_AGENCY_ROLE_VIEW')
  @ApiOperation({ summary: 'Get a single Global Agency role' })
  @ApiParam({ name: 'id', description: 'Role id (serialized BigInt)', example: ROLE_EXAMPLE.id })
  @ApiOkResponse({ description: 'The requested Global Agency role', schema: ROLE_SCHEMA })
  @ApiNotFoundResponse({ description: 'Global Agency role not found' })
  getById(@Param('id') id: string): Promise<RoleResponse> {
    return this.rolesService.getById('AGENCY', id);
  }

  @Post()
  @RequirePermissions('PLATFORM_AGENCY_ROLE_CREATE')
  @ApiOperation({
    summary: 'Create a Global Agency role',
    description:
      'The scope is always AGENCY with a null agencyId and cannot be chosen by the request. `key` is the stable technical identifier and is immutable afterwards.',
  })
  @ApiBody({
    description: 'Role key and name are unique among Global Agency roles.',
    schema: {
      type: 'object',
      required: ['key', 'name'],
      properties: {
        key: { type: 'string', maxLength: 64, example: 'AGENCY_BOOKING_AGENT' },
        name: { type: 'string', maxLength: 100, example: 'Booking Agent' },
        description: { type: 'string', nullable: true, example: 'Handles booking operations for agencies' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Global Agency role created', schema: ROLE_SCHEMA })
  @ApiConflictResponse({
    description: 'A Global Agency role with this key or name already exists',
  })
  create(@Body({ schema: createRoleSchema }) dto: CreateRoleBody): Promise<RoleResponse> {
    return this.rolesService.create('AGENCY', dto);
  }

  @Patch(':id')
  @RequirePermissions('PLATFORM_AGENCY_ROLE_UPDATE')
  @ApiOperation({
    summary: 'Update a Global Agency role (name or description)',
    description: 'Scope, agencyId and key are immutable and are never accepted by this endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Role id (serialized BigInt)', example: ROLE_EXAMPLE.id })
  @ApiBody({
    description: 'Only provided fields are updated. Pass description: null to clear it.',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', maxLength: 100, example: 'Booking Agent' },
        description: { type: 'string', nullable: true, example: 'Handles booking operations' },
      },
    },
  })
  @ApiOkResponse({ description: 'Global Agency role updated', schema: ROLE_SCHEMA })
  @ApiNotFoundResponse({ description: 'Global Agency role not found' })
  @ApiConflictResponse({ description: 'Name conflict within the scope' })
  update(
    @Param('id') id: string,
    @Body({ schema: updateRoleSchema }) dto: UpdateRoleBody,
  ): Promise<RoleResponse> {
    return this.rolesService.update('AGENCY', id, dto);
  }

  @Delete(':id')
  @RequirePermissions('PLATFORM_AGENCY_ROLE_DELETE')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a Global Agency role' })
  @ApiParam({ name: 'id', description: 'Role id (serialized BigInt)', example: ROLE_EXAMPLE.id })
  @ApiNoContentResponse({ description: 'Global Agency role deleted' })
  @ApiNotFoundResponse({ description: 'Global Agency role not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.rolesService.remove('AGENCY', id);
  }

  @Get(':id/permissions')
  @RequirePermissions('PLATFORM_AGENCY_ROLE_VIEW')
  @ApiOperation({ summary: 'Get the permission keys assigned to a Global Agency role' })
  @ApiParam({ name: 'id', description: 'Role id (serialized BigInt)', example: ROLE_EXAMPLE.id })
  @ApiOkResponse({
    description: 'Sorted permission keys assigned to the role',
    schema: { type: 'array', items: { type: 'string', example: 'AGENCY_BOOKING_VIEW' } },
  })
  @ApiNotFoundResponse({ description: 'Global Agency role not found' })
  getRolePermissions(@Param('id') id: string): Promise<string[]> {
    return this.rolesService.getRolePermissionKeys('AGENCY', id);
  }

  @Put(':id/permissions')
  @RequirePermissions('PLATFORM_AGENCY_ROLE_PERMISSION_MANAGE')
  @ApiOperation({
    summary: 'Replace all permissions of a Global Agency role (atomic)',
    description:
      'The provided list replaces the full permission set. Duplicate keys are reduced; pass an empty array to clear all permissions. Unknown or cross-scope keys are rejected.',
  })
  @ApiParam({ name: 'id', description: 'Role id (serialized BigInt)', example: ROLE_EXAMPLE.id })
  @ApiBody({
    description: 'All keys must already exist and must be AGENCY-scoped.',
    schema: {
      type: 'object',
      required: ['permissionKeys'],
      properties: {
        permissionKeys: {
          type: 'array',
          items: { type: 'string', example: 'AGENCY_BOOKING_VIEW' },
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'The final effective permission keys',
    schema: {
      type: 'object',
      properties: {
        roleId: { type: 'string', example: ROLE_EXAMPLE.id },
        permissionKeys: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Global Agency role not found' })
  @ApiBadRequestResponse({
    description: 'One or more permission keys are unknown or belong to another scope',
  })
  replaceRolePermissions(
    @Param('id') id: string,
    @Body({ schema: replaceRolePermissionsSchema }) dto: { permissionKeys: string[] },
  ): Promise<ReplaceRolePermissionsResponse> {
    return this.rolesService.replaceRolePermissions('AGENCY', id, dto.permissionKeys);
  }
}
