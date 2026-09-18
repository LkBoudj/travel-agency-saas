import type { PlatformUserRow } from './platform-users.types.js';
import type { PlatformUserResponse } from './platform-users.types.js';
import type { PlatformUserRoleRef } from './platform-users.types.js';

export function toPlatformUserResponse(user: PlatformUserRow): PlatformUserResponse {
  return {
    code: user.code,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    status: user.status as PlatformUserResponse['status'],
    roles: toPlatformUserRoleRefs(user),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toPlatformUserRoleRefs(user: PlatformUserRow): PlatformUserRoleRef[] {
  return user.platformRoleAssignments.map((assignment) => ({
    key: assignment.role.key,
    name: assignment.role.name,
  }));
}