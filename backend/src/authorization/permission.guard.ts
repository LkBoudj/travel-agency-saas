import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { InternalAuthUser } from '../auth/auth-user.js';
import { CaslAbilityFactory } from './casl-ability.factory.js';
import { PlatformPermissionsService } from './platform-permissions.service.js';
import { REQUIRE_PERMISSIONS_KEY } from './require-permissions.decorator.js';

/**
 * Authorization guard. Composes with JwtAuthGuard (@UseGuards(JwtAuthGuard, PermissionGuard)):
 *
 *   JWT authentication -> request.user identity -> DB permission keys -> CASL ability
 *
 * 401 = authentication failure (no/invalid identity).
 * 403 = authenticated but insufficient permission.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PlatformPermissionsService,
    private readonly abilities: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRE_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: InternalAuthUser }>();
    if (!request.user) {
      throw new UnauthorizedException();
    }

    const permissionKeys = await this.permissions.getPermissionKeysForUser(request.user.id);
    const ability = this.abilities.createAbility(permissionKeys);

    if (!required.every((key) => ability.can(key, 'all'))) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}