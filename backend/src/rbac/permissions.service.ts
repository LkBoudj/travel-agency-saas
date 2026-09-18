import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { toPermissionResponse } from './rbac-serializers.js';
import type { PermissionResponse } from './rbac.types.js';

/**
 * Read-only view over the code-owned permission catalog.
 *
 * Scoped to PLATFORM so the platform surface can never observe or leak
 * Agency-scoped capabilities.
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  list(): Promise<PermissionResponse[]> {
    return this.prisma.permission
      .findMany({ where: { scope: 'PLATFORM' }, orderBy: { key: 'asc' } })
      .then((permissions) => permissions.map(toPermissionResponse));
  }
}
