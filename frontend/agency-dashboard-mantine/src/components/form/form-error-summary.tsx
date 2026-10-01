import { useEffect, useRef } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Box, List, Text, UnstyledButton } from '@mantine/core';
import type { FormErrors } from '@mantine/form';

/**
 * The single announcement of a failed submit.
 *
 * Inline field errors only help a user who is already looking at the field, so
 * this summary is what the screen reader announces (`role="alert"`) and what
 * keyboard focus lands on once validation fails — otherwise submitting an
 * invalid form moves nothing and the failure is invisible (the class of bug
 * the website editor already had). Each entry is a button that moves focus to
 * its field, so a keyboard user does not have to hunt for it.
 *
 * The messages are the ones the field already shows; nothing here re-validates.
 */
export function FormErrorSummary({ errors, title }: { errors: FormErrors; title?: string }) {
  const { t } = useTranslation('common');
  const containerRef = useRef<HTMLDivElement>(null);
  // `FormErrors` is `Record<string, ReactNode>`; the forms in this app always
  // store a translated string, and a node from anywhere else still renders.
  const entries = Object.entries(errors).filter(([, value]) => value != null && value !== '');

  // Focus only when validation *fails* — never on every keystroke, which would
  // fight the field the user is typing in.
  useEffect(() => {
    if (entries.length > 0) {
      containerRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.length]);

  if (entries.length === 0) {
    return null;
  }

  const focusField = (field: string) => {
    // Scoped to this form: a dialog can host a second form, and a jump across
    // dialogs would move focus to an invisible control. `data-path` is the hook
    // `@mantine/form` puts on every control it renders; `name`/`id` are the
    // fallbacks for a hand-written input.
    const owner = containerRef.current?.closest('form') ?? document;
    const control = owner.querySelector<HTMLElement>(
      `[data-path="${field}"], [name="${field}"], #${CSS.escape(field)}`
    );
    control?.focus();
  };

  return (
    <Box
      ref={containerRef}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- the summary
      // is programmatically focusable so a failed submit can move focus here.
      tabIndex={-1}
      role="alert"
      p="sm"
      bg="var(--app-surface-danger)"
      style={{
        border: '1px solid var(--app-border-danger)',
        borderRadius: 'var(--mantine-radius-md)',
      }}
    >
      <Text size="sm" fw={600} c="var(--app-text-danger)">
        {title ?? t('form.errorSummary')}
      </Text>
      <List
        mt={4}
        size="sm"
        spacing={2}
        icon={
          <IconAlertTriangle size={14} stroke={1.5} color="var(--app-icon-danger)" aria-hidden />
        }
      >
        {entries.map(([field, message]) => (
          <List.Item key={field}>
            <UnstyledButton
              onClick={() => focusField(field)}
              c="var(--app-text-danger)"
              // A `button` here is the control a keyboard user presses to reach
              // the field; the message stays as its accessible name.
              aria-label={typeof message === 'string' ? message : field}
              fw={500}
            >
              {message}
            </UnstyledButton>
          </List.Item>
        ))}
      </List>
    </Box>
  );
}
