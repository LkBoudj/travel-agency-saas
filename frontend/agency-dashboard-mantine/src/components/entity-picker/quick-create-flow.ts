/**
 * When the typed query matches no existing option, an entity picker may offer
 * inline creation of a new entity from that keyword. This module holds the
 * pure rules for that offer.
 */
import type { EntityOption } from './entity-option.ts';

/** A trimmed, non-blank keyword is the seed for quick-create. */
export function quickCreateKeyword(query: string): string {
  return query.trim();
}

/**
 * Offer inline creation when the operator has typed something and is allowed
 * to create, unless the keyword already matches an option's code exactly —
 * that would be a redundant "create the thing I just picked".
 */
export function shouldOfferQuickCreate(
  options: readonly EntityOption[],
  query: string,
  canCreate: boolean
): boolean {
  if (!canCreate) {
    return false;
  }
  const keyword = quickCreateKeyword(query);
  if (keyword.length === 0) {
    return false;
  }
  return !options.some((option) => option.code.toLowerCase() === keyword.toLowerCase());
}

/**
 * Combobox options are keyed by their value string. A quick-create offer is
 * just another option; the prefix keeps its value out of the key space of real
 * entity codes (which are always uppercase `XXX-...`).
 */
export const QUICK_CREATE_PREFIX = 'quick-create:';

export function quickCreateOptionValue(keyword: string): string {
  return `${QUICK_CREATE_PREFIX}${keyword}`;
}

export function isQuickCreateValue(value: string): boolean {
  return value.startsWith(QUICK_CREATE_PREFIX);
}

export function keywordFromQuickCreateValue(value: string): string {
  return value.slice(QUICK_CREATE_PREFIX.length);
}

/**
 * Split a typed keyword into a first/last name for a person quick-create
 * (customers are the only entity picker that currently offers creation).
 * "first" is the first token; everything after it is the last name; a sole
 * token produces an empty last name.
 */
export function splitKeywordIntoPersonName(keyword: string): {
  firstName: string;
  lastName: string;
} {
  const parts = keyword
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  };
}
