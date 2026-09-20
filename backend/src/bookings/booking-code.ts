import { randomBytes } from 'node:crypto';

const CODE_PREFIX = 'BKG';
const CODE_RANDOM_BYTES = 6;

/**
 * Public booking code, e.g. `BKG-3F2A91C7B4D0`.
 *
 * Mirrors Tour/Departure/PricingOption/Customer code generation: random,
 * backend-generated, immutable, human-shareable inside the agency. The client
 * never invents codes and never sees the database id.
 */
export function generateBookingCode(): string {
  return `${CODE_PREFIX}-${randomBytes(CODE_RANDOM_BYTES).toString('hex').toUpperCase()}`;
}