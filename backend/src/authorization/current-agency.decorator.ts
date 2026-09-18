import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AGENCY_ACCESS_REQUEST_KEY, type AgencyAccessContext } from './agency-access.js';

/**
 * Reads the agency context that `AgencyPermissionGuard` already resolved for
 * this request, so a handler never queries membership or permissions again.
 *
 * It is only ever populated on a route the guard accepted, which means a
 * handler receiving it can rely on: the agency exists, it is operational, and
 * the caller holds an ACTIVE membership in it.
 */
export const CurrentAgency = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AgencyAccessContext => {
    const request = context
      .switchToHttp()
      .getRequest<{ [AGENCY_ACCESS_REQUEST_KEY]?: AgencyAccessContext }>();

    const access = request[AGENCY_ACCESS_REQUEST_KEY];
    if (!access) {
      throw new Error(
        '[authz] @CurrentAgency used on a route that AgencyPermissionGuard did not resolve.',
      );
    }
    return access;
  },
);
