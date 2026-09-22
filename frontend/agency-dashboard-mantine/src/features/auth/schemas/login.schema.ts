import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type LoginField = keyof LoginFormValues;

type Translate = (key: string) => string;

export function getLoginFieldErrors(
  error: z.ZodError<LoginFormValues>,
  t: Translate
): Partial<Record<LoginField, string>> {
  const errors: Partial<Record<LoginField, string>> = {};

  for (const issue of error.issues) {
    const field = issue.path[0] as LoginField | undefined;

    if (field === 'email' && errors.email === undefined) {
      errors.email =
        issue.code === 'too_small' ? t('validation.emailRequired') : t('validation.emailInvalid');
    } else if (field === 'password' && errors.password === undefined) {
      errors.password = t('validation.passwordRequired');
    }
  }

  return errors;
}
