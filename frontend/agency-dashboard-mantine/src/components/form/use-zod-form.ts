import type { z } from 'zod';
import { useForm, type UseFormReturnType } from '@mantine/form';
import {
  createFieldErrorResolver,
  getFieldErrors,
  type FieldValidationKeys,
  type Translate,
} from '../../lib/form-errors.ts';

export interface UseZodFormOptions<Values extends object> {
  schema: z.ZodType<Values>;
  initialValues: Values;
  /** i18n keys per top-level field: `required` for missing, `invalid` otherwise. */
  fieldErrorKeys: Partial<Record<keyof Values & string, FieldValidationKeys>>;
  t: Translate;
}

/**
 * `@mantine/form` wired to a zod schema, reusing the app-wide field-error
 * resolver. Field-level validation runs on blur so dialogs show errors without
 * blocking typing.
 */
export function useZodForm<Values extends object>({
  schema,
  initialValues,
  fieldErrorKeys,
  t,
}: UseZodFormOptions<Values>): UseFormReturnType<Values> {
  const fieldKeys = fieldErrorKeys as Partial<Record<string, FieldValidationKeys>>;

  const form = useForm<Values>({
    initialValues,
    validateInputOnBlur: true,
    validate: (values) => {
      const result = schema.safeParse(values);
      if (result.success) {
        return {};
      }
      const toMessage = createFieldErrorResolver(fieldKeys)(t);
      return getFieldErrors(result.error, toMessage);
    },
  });

  return form;
}
