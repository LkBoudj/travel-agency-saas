import type { WebsiteFormValues } from '../schemas/website.schema.ts';

/**
 * "Has anything changed since this draft was loaded?"
 *
 * The editor's baseline is `websiteToFormValues(draft)` — the same function that
 * seeded the form — so comparing the two values answers the only question the
 * member is really asking: is there anything worth sending.
 *
 * Two details are deliberate:
 *
 * - **Strings compare trimmed.** The schema trims on parse and the payload
 *   builder trims again, so a trailing space saves nothing. Treating it as an
 *   edit would leave the indicator permanently on and teach the member to
 *   ignore it, which costs more than the space.
 * - **Key order does not count.** The form rebuilds its value object on every
 *   keystroke; two objects with the same content in a different order are the
 *   same content. List *order* does count, because that is what the storefront
 *   renders.
 */
function isEqual(left: unknown, right: unknown): boolean {
  if (typeof left === 'string' && typeof right === 'string') {
    return left.trim() === right.trim();
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((entry, index) => isEqual(entry, right[index]));
  }

  if (left !== null && right !== null && typeof left === 'object' && typeof right === 'object') {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    if (leftKeys.length !== rightKeys.length || leftKeys.some((key, i) => key !== rightKeys[i])) {
      return false;
    }
    return leftKeys.every((key) =>
      isEqual((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key])
    );
  }

  return left === right;
}

/** True when the form holds anything the saved draft does not. */
export function isWebsiteFormDirty(
  values: WebsiteFormValues,
  baseline: WebsiteFormValues
): boolean {
  return !isEqual(values, baseline);
}
