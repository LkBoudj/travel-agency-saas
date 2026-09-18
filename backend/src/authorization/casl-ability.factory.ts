import { Injectable } from '@nestjs/common';
import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';

export type PlatformPermissionKey = string;
export type PlatformAbility = MongoAbility<[PlatformPermissionKey, 'all']>;

@Injectable()
export class CaslAbilityFactory {
  createAbility(permissionKeys: readonly string[]): PlatformAbility {
    const { can, build } = new AbilityBuilder<PlatformAbility>(createMongoAbility);
    for (const key of new Set(permissionKeys)) {
      can(key, 'all');
    }
    return build();
  }
}