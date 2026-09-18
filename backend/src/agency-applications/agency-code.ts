import { randomBytes } from 'node:crypto';

const CODE_PREFIX = 'AGY';
const CODE_RANDOM_BYTES = 6;

/** Mirrors the AppUser code convention: `<PREFIX>-<12 uppercase hex>`. */
export function generateAgencyCode(): string {
  return `${CODE_PREFIX}-${randomBytes(CODE_RANDOM_BYTES).toString('hex').toUpperCase()}`;
}
