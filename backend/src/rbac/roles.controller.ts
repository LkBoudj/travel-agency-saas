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
  ApiNotFoundResponse,
  ApiNoContentResponse,
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

@ApiTags('roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: 'Missing, invalid or expired auth cookie' })
@ApiForbiddenResponse({ description: 'Authenticated but missing the required permission' })
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('PLATFORM_ROLE_VIEW')
  @ApiOperation({ summary: 'List all PLATFORM roles' })
  @ApiOkResponse({ description: 'All PLATFORM roles', schema: { type: 'array', items: ROLE_SCHEMA } })
  list(): Promise<RoleResponse[]> {
    return this.rolesService.list();
  }

  // Declared before `:id` so "available-permissions" is never captured as an id.
  @Get('available-permissions')
  @RequirePermissions('PLATFORM_ROLE_VIEW')
  @ApiOperation({
    summary: 'List the permissions available to PLATFORM roles',
    description:
      'Returns the code-defined PLATFORM permission catalog. Permissions are owned by application code and synchronized by the RBAC seed; they cannot be created, updated or deleted through the API.',
  })
  @ApiOkResponse({
    description: 'PLATFORM permissions that can be attached to a role',
    schema: { type: 'array', items: PERMISSION_SCHEMA },
  })
  listAvailablePermissions(): Promise<PermissionResponse[]> {
    return this.rolesService.listAvailablePermissions();
  }

  @Get(':id')
  @RequirePermissions('PLATFORM_ROLE_VIEW')
  @ApiOperation({ summary: 'Get a single PLATFORM role' })
  @ApiParam({ name: 'id', description: 'Role id (serialized BigInt)', example: ROLE_EXAMPLE.id })
  @ApiOkResponse({ description: 'The requested role', schema: ROLE_SCHEMA })
  @ApiNotFoundResponse({ description: 'PLATFORM role not found' })
  getById(@Param('id') id: string): Promise<RoleResponse> {
    return this.rolesService.getById(id);
  }

  @Post()
  @RequirePermissions('PLATFORM_ROLE_CREATE')
  @ApiOperation({
    summary: 'Create a PLATFORM role',
    description: 'The scope is always PLATFORM and cannot be chosen by the request.',
  })
  @ApiBody({
    description: 'Role name is unique among PLATFORM roles.',
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', maxLength: 100, example: 'Content Manager' },
        description: { type: 'string', nullable: true, example: 'Manages content roles' },
      },
    },
  })
  @ApiCreatedResponse({ description: 'Role created', schema: ROLE_SCHEMA })
  @ApiConflictResponse({ description: 'A PLATFORM role with this name already exists' })
  create(@Body({ schema: createRoleSchema }) dto: CreateRoleBody): Promise<RoleResponse> {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('PLATFORM_ROLE_UPDATE')
  @ApiOperation({
    summary: 'Update a PLATFORM role (name or description)',
    description: 'Scope is immutable and is never accepted by this endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Role id (serialized BigInt)', example: ROLE_EXAMPLE.id })
  @ApiBody({
    description: 'Only provided fields are updated. Pass description: null to clear it.',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', maxLength: 100, example: 'Content Manager' },
        description: { type: 'string', nullable: true, example: 'Manages content roles' },
      },
    },
  })
  @ApiOkResponse({ description: 'Role updated', schema: ROLE_SCHEMA })
  @ApiNotFoundResponse({ description: 'PLATFORM role not found' })
  @ApiConflictResponse({ description: 'Name conflict within the scope' })
  update(
    @Param('id') id: string,
    @Body({ schema: updateRoleSchema }) dto: UpdateRoleBody,
  ): Promise<RoleResponse> {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('PLATFORM_ROLE_DELETE')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a PLATFORM role',
    description: 'Fails with 409 if the role still has platform assignments.',
  })
  @ApiParam({ name: 'id', description: 'Role id (serialized BigInt)', example: ROLE_EXAMPLE.id })
  @ApiNoContentResponse({ description: 'Role deleted' })
  @ApiNotFoundResponse({ description: 'PLATFORM role not found' })
  @ApiConflictResponse({ description: 'Role still has platform assignments' })
  remove(@Param('id') id: string): Promise<void> {
    return this.rolesService.remove(id);
  }

  @Get(':id/permissions')
  @RequirePermissions('PLATFORM_ROLE_VIEW')
  @ApiOperation({ summary: 'Get the permission keys assigned to a PLATFORM role' })
  @ApiParam({ name: 'id', description: 'Role id (serialized BigInt)', example: ROLE_EXAMPLE.id })
  @ApiOkResponse({
    description: 'Permission keys (sorted)',
    schema: { type: 'object', properties: { permissionKeys: { type: 'array', items: { type: 'string' } } } },
  })
  @ApiNotFoundResponse({ description: 'PLATFORM role not found' })
  getRolePermissions(@Param('id') id: string): Promise<string[]> {
    return this.rolesService.getRolePermissionKeys(id);
  }

  @Put(':id/permissions')
  @RequirePermissions('PLATFORM_ROLE_PERMISSION_MANAGE')
  @ApiOperation({
    summary: 'Replace all permissions of a PLATFORM role (atomic)',
    description:
      'The provided list replaces the full permission set. Duplicate keys are reduced; pass an empty array to clear all permissions. Unknown or cross-scope keys are rejected.',
  })
  @ApiParam({ name: 'id', description: 'Role id (serialized BigInt)', example: ROLE_EXAMPLE.id })
  @ApiBody({
    description: 'All keys must already exist and must be PLATFORM-scoped.',
    schema: {
      type: 'object',
      required: ['permissionKeys'],
      properties: {
        permissionKeys: {
          type: 'array',
          items: { type: 'string', example: 'PLATFORM_ROLE_VIEW' },
          example: ['PLATFORM_USER_VIEW', 'PLATFORM_ROLE_VIEW', 'PLATFORM_ROLE_VIEW'],
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
  @ApiNotFoundResponse({ description: 'PLATFORM role not found' })
  @ApiBadRequestResponse({
    description: 'One or more permission keys are unknown or belong to another scope',
  })
  replaceRolePermissions(
    @Param('id') id: string,
    @Body({ schema: replaceRolePermissionsSchema }) dto: { permissionKeys: string[] },
  ): Promise<ReplaceRolePermissionsResponse> {
    return this.rolesService.replaceRolePermissions(id, dto.permissionKeys);
  }
}
