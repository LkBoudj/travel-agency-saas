import { randomBytes } from 'node:crypto';

const CODE_PREFIX = 'TRV';
const CODE_RANDOM_BYTES = 6;

/**
 * Public traveler code, e.g. `TRV-3F2A91C7B4D0`.
 *
 * Mirrors Booking/Customer/Tour/Departure/PricingOption code generation: random,
 * backend-generated, immutable, human-shareable inside the agency. The client
 * never invents codes and never sees the database id.
 */
export function generateTravelerCode(): string {
  return `${CODE_PREFIX}-${randomBytes(CODE_RANDOM_BYTES).toString('hex').toUpperCase()}`;
}