import { fireEvent, render, screen } from '@test-utils';
import { useTranslation } from 'react-i18next';
import { describe, expect, test } from 'vitest';
import { z } from 'zod';
import { TextInput } from '@mantine/core';
import type { FormErrors } from '@mantine/form';
import '../../i18n/index.ts';
import { FieldError } from './field-error.tsx';
import { FormErrorSummary } from './form-error-summary.tsx';
import { useZodForm } from './use-zod-form.ts';

const ERRORS: FormErrors = {
  email: 'Enter a valid email address.',
  firstName: 'First name is required.',
};

describe('FormErrorSummary', () => {
  test('renders nothing while the form is valid', () => {
    render(<FormErrorSummary errors={{}} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('announces every message and takes focus when it appears', () => {
    const { rerender } = render(<FormErrorSummary errors={{}} />);

    rerender(<FormErrorSummary errors={ERRORS} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Fix the highlighted fields to continue.');
    expect(alert).toHaveTextContent('Enter a valid email address.');
    expect(alert).toHaveTextContent('First name is required.');
    expect(alert).toHaveAttribute('tabindex', '-1');
    expect(document.activeElement).toBe(alert);
  });

  test('moves focus to the control a message points at', async () => {
    render(
      <form>
        <FormErrorSummary errors={ERRORS} />
        <input id="email" name="email" />
      </form>
    );

    await screen.getByRole('button', { name: 'Enter a valid email address.' }).click();

    expect(document.activeElement).toBe(document.getElementById('email'));
  });
});
/**
 * The wiring, not just the component: a real `useZodForm` form whose submit is
 * rejected must announce the failure, take focus and keep the inline errors.
 */
function RequiredNameForm() {
  const { t } = useTranslation('customers');
  const form = useZodForm<{ name: string }>({
    schema: z.object({ name: z.string().min(1) }),
    initialValues: { name: '' },
    fieldErrorKeys: { name: { required: 'errors.emailInvalid' } },
    t,
  });
  const submit = form.onSubmit(() => {
    throw new Error('must not submit');
  });

  return (
    <form onSubmit={submit}>
      <FormErrorSummary errors={form.errors} />
      <TextInput label="Name" {...form.getInputProps('name')} />
      <FieldError message={form.errors.name} />
      <button type="submit">Save</button>
    </form>
  );
}

describe('FormErrorSummary in a real form', () => {
  test('announces the rejected submit and keeps the inline error', () => {
    render(<RequiredNameForm />);

    fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form')!);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Fix the highlighted fields to continue.');
    expect(alert).toHaveTextContent('Enter a valid email address.');
    expect(document.activeElement).toBe(alert);
    // The field still carries its own message: the summary adds to it.
    expect(screen.getAllByText('Enter a valid email address.').length).toBeGreaterThan(1);

    // And the summary is a way to the field, not just a list of complaints.
    fireEvent.click(screen.getByRole('button', { name: 'Enter a valid email address.' }));
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
  });
});
