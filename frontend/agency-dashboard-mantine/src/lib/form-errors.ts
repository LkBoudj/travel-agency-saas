import type { z } from 'zod';

export type Translate = (key: string) => string;

/**
 * Map a Zod error to per-field messages for Mantine's `useForm`.
 *
 * Only the FIRST issue of each top-level field is kept (Zod reports in order),
 * and any field the resolver declines is skipped (stays unset).
 */
export function getFieldErrors<F extends string>(
  error: z.ZodError,
  toMessage: (field: F, issue: z.ZodIssue) => string | undefined
): Partial<Record<F, string>> {
  const errors: Partial<Record<F, string>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0] as F | undefined;
    if (field === undefined) {
      continue;
    }
    if (field in errors) {
      continue;
    }
    const message = toMessage(field, issue);
    if (message !== undefined && message.length > 0) {
      errors[field] = message;
    }
  }

  return errors;
}

export interface FieldValidationKeys {
  /** Key used when the field is missing/empty (`too_small`). */
  required?: string;
  /** Key used for any other issue (bad format, too many, wrong type…). */
  invalid?: string;
}

/**
 * Build a `toMessage` resolver from plain i18n keys. `too_small` is treated as
 * "required", every other issue as "invalid" — the two shapes a form field
 * usually reports.
 */
export function createFieldErrorResolver<F extends string>(
  validationKeys: Partial<Record<F, FieldValidationKeys>>
): (t: Translate) => (field: F, issue: z.ZodIssue) => string | undefined {
  return (t) => (field, issue) => {
    const keys = validationKeys[field];
    if (!keys) {
      return undefined;
    }
    const messageKey = issue.code === 'too_small' ? keys.required : keys.invalid;
    return messageKey ? t(messageKey) : undefined;
  };
}
