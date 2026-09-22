import type { AgencyMember } from '../types.ts';

/** Full name when known, the email otherwise — the safest human label. */
export function memberDisplayName(member: AgencyMember): string {
  const parts = [member.firstName, member.lastName].filter((part) => part !== null && part !== '');
  return parts.length > 0 ? parts.join(' ') : member.email;
}

/** Up to two initials from the name (fallback: first letters of the email). */
export function memberInitials(member: AgencyMember): string {
  const name = memberDisplayName(member);
  const parts = name.split(/\s+/).filter((part) => part.length > 0);
  const source = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return source
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
