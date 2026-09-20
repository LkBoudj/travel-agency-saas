import { randomBytes } from 'node:crypto';

const CODE_PREFIX = 'TUR';
const CODE_RANDOM_BYTES = 6;

/**
 * Public tour code, e.g. `TUR-3F2A91C7B4D0`.
 *
 * Mirrors AppUser/Agency/Customer/Invitation code generation: random,
 * backend-generated, immutable, human-shareable inside the agency. The client
 * never invents codes and never sees the database id.
 */
export function generateTourCode(): string {
  return `${CODE_PREFIX}-${randomBytes(CODE_RANDOM_BYTES).toString('hex').toUpperCase()}`;
}