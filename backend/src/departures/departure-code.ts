import { randomBytes } from 'node:crypto';

const CODE_PREFIX = 'DEP';
const CODE_RANDOM_BYTES = 6;

/**
 * Public departure code, e.g. `DEP-3F2A91C7B4D0`.
 *
 * Mirrors Tour/AppUser/Agency/Customer/Invitation code generation: random,
 * backend-generated, immutable, human-shareable inside the agency. The client
 * never invents codes and never sees the database id.
 */
export function generateDepartureCode(): string {
  return `${CODE_PREFIX}-${randomBytes(CODE_RANDOM_BYTES).toString('hex').toUpperCase()}`;
}