import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { InternalAuthUser } from '../auth/auth-user.js';
import { AGENCY_ACCESS_REQUEST_KEY, type AgencyAccessContext } from './agency-access.js';
import { AgencyPermissionsService } from './agency-permissions.service.js';
import { CaslAbilityFactory } from './casl-ability.factory.js';
import {
  AGENCY_CONTEXT_ONLY_KEY,
  REQUIRE_AGENCY_PERMISSIONS_KEY,
} from './require-agency-permissions.decorator.js';

/** Route parameter carrying the agency a request operates on. */
export const AGENCY_CODE_PARAM = 'agencyCode';

/**
 * Agency-scoped authorization guard. Composes with `JwtAuthGuard`:
 *
 *   JWT authentication -> request.user identity
 *     -> :agencyCode -> Agency (404 when unknown)
 *     -> agency must be operational (403 AGENCY_SUSPENDED)
 *     -> ACTIVE membership for this user (403)
 *     -> effective AGENCY permission keys from the database
 *     -> CASL ability -> required keys -> allow / 403
 *
 * The agency always comes from the ROUTE, never from a request body, so a
 * client cannot point an operation at an agency it has no membership in. The
 * resolved context is attached to the request so handlers never re-resolve it.
 *
 * `membershipType` is not consulted anywhere in this file: an OWNER is
 * evaluated through exactly the same permission check as an EMPLOYEE.
 */
@Injectable()
export class AgencyPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly agencyPermissions: AgencyPermissionsService,
    private readonly abilities: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_AGENCY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    const contextOnly = this.reflector.getAllAndOverride<boolean>(AGENCY_CONTEXT_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Routes that declare neither are not agency-scoped; this guard is inert.
    if ((!required || required.length === 0) && !contextOnly) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: InternalAuthUser;
      params?: Record<string, string>;
      [AGENCY_ACCESS_REQUEST_KEY]?: AgencyAccessContext;
    }>();

    if (!request.user) {
      throw new UnauthorizedException();
    }

    const agencyCode = request.params?.[AGENCY_CODE_PARAM];
    if (!agencyCode) {
      // A programming error: an agency-scoped route without the route param
      // would otherwise fall back to some ambient agency, which must never
      // happen.
      throw new BadRequestException({
        statusCode: 400,
        message: 'This route is agency-scoped but carries no agency code',
        errorCode: 'AGENCY_CODE_REQUIRED',
      });
    }

    const access = await this.agencyPermissions.resolveAccess(request.user.id, agencyCode);
    request[AGENCY_ACCESS_REQUEST_KEY] = access;

    if (!required || required.length === 0) {
      return true;
    }

    const ability = this.abilities.createAbility(access.permissionKeys);
    if (!required.every((key) => ability.can(key, 'all'))) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'You do not have permission to perform this action in this agency',
        errorCode: 'AGENCY_PERMISSION_DENIED',
      });
    }

    return true;
  }
}
