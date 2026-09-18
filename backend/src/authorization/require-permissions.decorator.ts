import { SetMetadata, CustomDecorator } from '@nestjs/common';

export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';

export function RequirePermissions(...permissions: string[]): CustomDecorator<string> {
  return SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
}