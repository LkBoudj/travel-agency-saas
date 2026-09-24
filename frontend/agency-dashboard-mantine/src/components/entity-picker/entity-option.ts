/**
 * One searchable choice in an entity picker.
 *
 * Codes are the backend's public keys; `label` is the human name shown when
 * the picker collapses that choice into its input; `sublabel` is optional
 * context (a date, an email, a code) rendered under the label inside the
 * dropdown.
 */
export interface EntityOption {
  code: string;
  label: string;
  sublabel?: string | null;
}

/** Case-insensitive substring match across code, label and sublabel. */
export function filterEntityOptions(
  options: readonly EntityOption[],
  query: string
): EntityOption[] {
  const term = query.trim().toLowerCase();
  if (term.length === 0) {
    return [...options];
  }
  return options.filter((option) =>
    [option.code, option.label, option.sublabel ?? ''].some((part) =>
      part.toLowerCase().includes(term)
    )
  );
}
