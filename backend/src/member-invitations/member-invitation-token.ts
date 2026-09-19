import { createHash, randomBytes } from 'node:crypto';

export interface GeneratedInvitationToken {
  /** Plaintext redemption token. The only place that ever exists is the
   *  delivery channel (email / dev log); it is never persisted, returned by an
   *  API or logged systematically. */
  token: string;
  /** SHA-256 hex of `token`. The column `token_hash` holds this and only this. */
  tokenHash: string;
}

/**
 * Public invitation code, e.g. `INV-3F2A91C7B4D0`.
 *
 * Mirrors AppUser/Agency code generation: random, human-shareable inside the
 * agency, never derived from the token hash. Codes appear in agency-side lists
 * and audit rows; the token hash never does.
 */
export function generateMemberInvitationCode(): string {
  const bytes = randomBytes(6).toString('hex').toUpperCase();
  return `INV-${bytes}`;
}

/**
 * Creates the 256-bit redemption token and its stored digest.
 *
 * 43 base64url characters (32 random bytes). The digest is what acceptance
 * looks up, so the database is searched by a value an attacker who dumps the
 * table cannot reverse or use.
 */
export function generateMemberInvitationToken(): GeneratedInvitationToken {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashMemberInvitationToken(token) };
}

export function hashMemberInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}