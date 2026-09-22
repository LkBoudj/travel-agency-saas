import type { Customer } from '../types.ts';

/** Full name when known, the email or code otherwise — the safest human label. */
export function customerDisplayName(customer: Customer): string {
  const parts = [customer.firstName, customer.lastName].filter(
    (part) => part !== null && part !== ''
  );
  if (parts.length > 0) {
    return parts.join(' ');
  }
  return customer.email ?? customer.code;
}

/** Up to two initials from the name (fallback: first letters of the email or code). */
export function customerInitials(customer: Customer): string {
  const name = customerDisplayName(customer);
  const parts = name.split(/\s+/).filter((part) => part.length > 0);
  const source = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return source
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
