import { randomBytes } from 'node:crypto';

const CODE_PREFIX = 'PRC';
const CODE_RANDOM_BYTES = 6;

/**
 * Public pricing option code, e.g. `PRC-3F2A91C7B4D0`.
 *
 * Mirrors Tour/Departure/Customer/Invitation code generation: random,
 * backend-generated, immutable, human-shareable inside the agency. The client
 * never invents codes and never sees the database id.
 */
export function generatePricingOptionCode(): string {
  return `${CODE_PREFIX}-${randomBytes(CODE_RANDOM_BYTES).toString('hex').toUpperCase()}`;
}