import { randomBytes } from 'node:crypto';

const CODE_PREFIX = 'CUS';
const CODE_RANDOM_BYTES = 6;

/**
 * Public customer code, e.g. `CUS-3F2A91C7B4D0`.
 *
 * Mirrors AppUser/Agency/Invitation code generation: random, backend-generated,
 * immutable, human-shareable inside the agency. The client never invents codes
 * and never sees the database id.
 */
export function generateCustomerCode(): string {
  return `${CODE_PREFIX}-${randomBytes(CODE_RANDOM_BYTES).toString('hex').toUpperCase()}`;
}