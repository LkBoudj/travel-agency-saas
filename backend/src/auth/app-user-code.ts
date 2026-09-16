import { randomBytes } from 'node:crypto';

const CODE_PREFIX = 'USR';
const CODE_RANDOM_BYTES = 6;

export function generateAppUserCode(): string {
  return `${CODE_PREFIX}-${randomBytes(CODE_RANDOM_BYTES).toString('hex').toUpperCase()}`;
}