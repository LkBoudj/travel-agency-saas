import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm, type UseFormReturnType } from '@mantine/form';
import { routePaths } from '../../../app/router/route-paths.ts';
import { getLoginErrorMessage } from '../lib/auth-error-messages.ts';
import { getLoginFieldErrors, loginSchema, type LoginFormValues } from '../schemas/login.schema.ts';
import { useLogin } from './use-auth.ts';

export interface LoginFormController {
  form: UseFormReturnType<LoginFormValues>;
  handleSubmit: (event?: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  errorMessage: string | null;
}

export function useLoginForm(): LoginFormController {
  const { t } = useTranslation('auth');
  const login = useLogin();
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    initialValues: { email: '', password: '' },
    validate: (values) => {
      const result = loginSchema.safeParse(values);
      return result.success ? {} : getLoginFieldErrors(result.error, t);
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    login.mutate(values, { onSuccess: () => navigate(routePaths.root, { replace: true }) });
  });

  return {
    form,
    handleSubmit,
    isPending: login.isPending,
    errorMessage: login.error ? getLoginErrorMessage(login.error, t) : null,
  };
}
