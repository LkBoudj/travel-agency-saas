import type { MyAgency } from '../types.ts';

/** Public agency code, e.g. `AGY-3F2A91C7B4D0` (backend-generated, immutable). */
export function isAgencyCode(value: string): boolean {
  return /^AGY-[A-Z0-9]{6,}$/.test(value);
}

export function normalizeAgencyCode(value: string): string {
  return value.trim().toUpperCase();
}

/** A membership the signed-in user may actually enter (agency alive + membership active). */
export function canEnterAgency(agency: MyAgency): boolean {
  return agency.status === 'ACTIVE' && agency.membershipStatus === 'ACTIVE';
}

/** Enterable agencies keep owner-first, then-name ordering; suspended ones come last. */
export function sortEnterableAgencies(agencies: MyAgency[]): MyAgency[] {
  return [...agencies].sort((a, b) => {
    const aEnterable = canEnterAgency(a);
    const bEnterable = canEnterAgency(b);
    if (aEnterable !== bEnterable) {
      return aEnterable ? -1 : 1;
    }
    if (a.membershipType !== b.membershipType) {
      return a.membershipType === 'OWNER' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}
