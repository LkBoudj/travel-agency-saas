import { randomBytes } from 'node:crypto';

const CODE_PREFIX = 'PAY';
const CODE_RANDOM_BYTES = 6;

/**
 * Public payment code, e.g. `PAY-3F2A91C7B4D0`.
 *
 * Mirrors Booking/Customer/Tour/Departure/Traveler code generation: random,
 * backend-generated, immutable, human-shareable inside the agency. The client
 * never invents codes and never sees the database id. A payment row is an
 * append-only ledger entry, so this code is the stable handle an auditor uses
 * to cite one specific receipt.
 */
export function generatePaymentCode(): string {
  return `${CODE_PREFIX}-${randomBytes(CODE_RANDOM_BYTES).toString('hex').toUpperCase()}`;
}