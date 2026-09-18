import type { Permission, Role } from '../generated/prisma/client.js';
import type {
  PermissionResponse,
  PermissionScope,
  RoleResponse,
  RoleScope,
} from './rbac.types.js';

export function toRoleResponse(role: Role): RoleResponse {
  return {
    id: role.id.toString(),
    name: role.name,
    key: role.key,
    scope: role.scope as RoleScope,
    agencyId: role.agencyId === null ? null : role.agencyId.toString(),
    description: role.description,
    createdAt: role.createdAt.toISOString(),
    updatedAt: role.updatedAt.toISOString(),
  };
}

export function toPermissionResponse(permission: Permission): PermissionResponse {
  return {
    key: permission.key,
    name: permission.name,
    description: permission.description,
    scope: permission.scope as PermissionScope,
    resource: permission.resource,
    action: permission.action,
    createdAt: permission.createdAt.toISOString(),
  };
}
