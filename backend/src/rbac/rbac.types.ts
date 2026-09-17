export type RoleScope = 'PLATFORM' | 'AGENCY';

export type PermissionScope = 'PLATFORM' | 'AGENCY';

export type PermissionResource = 'USER' | 'ROLE' | 'ROLE_PERMISSION' | 'USER_ROLE';

export type PermissionAction = 'VIEW' | 'CREATE' | 'UPDATE' | 'DISABLE' | 'DELETE' | 'MANAGE';

export interface PermissionCatalogEntry {
  key: string;
  name: string;
  description: string;
  scope: PermissionScope;
  resource: PermissionResource;
  action: PermissionAction;
}

export interface RoleResponse {
  id: string;
  name: string;
  scope: RoleScope;
  /**
   * Ownership discriminator. Null means the role is global: a PLATFORM role or a
   * Platform-Admin-managed Global Agency role. A value means a Custom Agency role
   * owned by that agency.
   */
  agencyId: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionResponse {
  key: string;
  name: string;
  description: string | null;
  scope: PermissionScope;
  resource: string;
  action: string;
  createdAt: string;
}

export interface ReplaceRolePermissionsResponse {
  roleId: string;
  permissionKeys: string[];
}
