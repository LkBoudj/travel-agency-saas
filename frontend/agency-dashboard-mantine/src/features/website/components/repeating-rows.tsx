import type { ReactNode } from 'react';
import { IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Grid, TextInput, Textarea } from '@mantine/core';
import type { WebsiteForm } from '../hooks/use-website-form.ts';

/**
 * The repeating-row layout the Website editor rebuilds by hand in six places.
 *
 * Each of those copies had the same two defects: `style={{ flex: 1 }}` on one
 * or two fields (which pinned the row to a single line at every width, so the
 * 14%-wide icon field became unusable on a phone) and a remove button labelled
 * only "remove", so six buttons on one tab were indistinguishable to a screen
 * reader.
 *
 * The grid is `grow` with responsive spans: fields share the row on a desktop,
 * stack to full width below `sm`, and the remove control keeps its own narrow
 * track so it never stretches.
 */
export function RepeatingRow({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode;
  onRemove: () => void;
  /** Names both the tooltip and the accessible name of the remove control. */
  removeLabel: string;
}) {
  return (
    <Grid grow align="flex-end" gap="sm">
      {children}
      <Grid.Col span={{ base: 'auto', sm: 'auto' }}>
        <ActionIcon variant="subtle" color="red" aria-label={removeLabel} onClick={onRemove}>
          <IconTrash size={16} />
        </ActionIcon>
      </Grid.Col>
    </Grid>
  );
}

/** One field on its own responsive track: full width on a phone, a share of the row above it. */
function Field({
  span,
  children,
}: {
  span: { base: number | 'auto'; sm: number | 'auto' };
  children: ReactNode;
}) {
  return <Grid.Col span={span}>{children}</Grid.Col>;
}

export function TrustPointRow({ form, index }: { form: WebsiteForm; index: number }) {
  const { t } = useTranslation('website');

  return (
    <RepeatingRow
      onRemove={() => form.removeListItem('trustPoints', index)}
      removeLabel={`${t('removeTrustPoint')} ${index + 1}`}
    >
      <Field span={{ base: 12, sm: 2 }}>
        <TextInput
          placeholder={t('placeholders.icon')}
          {...form.getInputProps(`trustPoints.${index}.icon`)}
        />
      </Field>
      <Field span={{ base: 12, sm: 3 }}>
        <TextInput
          placeholder={t('placeholders.trustPointTitle')}
          {...form.getInputProps(`trustPoints.${index}.title`)}
        />
      </Field>
      <Field span={{ base: 12, sm: 6 }}>
        <TextInput
          placeholder={t('placeholders.trustPointText')}
          {...form.getInputProps(`trustPoints.${index}.text`)}
        />
      </Field>
    </RepeatingRow>
  );
}

export function TestimonialRow({ form, index }: { form: WebsiteForm; index: number }) {
  const { t } = useTranslation('website');

  return (
    <RepeatingRow
      onRemove={() => form.removeListItem('testimonials', index)}
      removeLabel={`${t('removeTestimonial')} ${index + 1}`}
    >
      <Field span={{ base: 12, sm: 6 }}>
        <Textarea
          placeholder={t('placeholders.quote')}
          autosize
          minRows={1}
          maxRows={4}
          {...form.getInputProps(`testimonials.${index}.quote`)}
        />
      </Field>
      <Field span={{ base: 12, sm: 3 }}>
        <TextInput
          placeholder={t('placeholders.author')}
          {...form.getInputProps(`testimonials.${index}.author`)}
        />
      </Field>
      <Field span={{ base: 12, sm: 3 }}>
        <TextInput
          placeholder={t('placeholders.location')}
          {...form.getInputProps(`testimonials.${index}.location`)}
        />
      </Field>
    </RepeatingRow>
  );
}

export function NavigationLinkRow({ form, index }: { form: WebsiteForm; index: number }) {
  const { t } = useTranslation('website');

  return (
    <RepeatingRow
      onRemove={() => form.removeListItem('navigation', index)}
      removeLabel={`${t('removeNavigationLink')} ${index + 1}`}
    >
      <Field span={{ base: 12, sm: 5 }}>
        <TextInput
          placeholder={t('placeholders.navLabel')}
          {...form.getInputProps(`navigation.${index}.label`)}
        />
      </Field>
      <Field span={{ base: 12, sm: 6 }}>
        <TextInput
          placeholder={t('placeholders.href')}
          {...form.getInputProps(`navigation.${index}.href`)}
        />
      </Field>
    </RepeatingRow>
  );
}

/** The heading of a footer column: one field, plus the control that removes it. */
export function FooterColumnRow({ form, columnIndex }: { form: WebsiteForm; columnIndex: number }) {
  const { t } = useTranslation('website');

  return (
    <RepeatingRow
      onRemove={() => form.removeListItem('footer.columns', columnIndex)}
      removeLabel={`${t('removeFooterColumn')} ${columnIndex + 1}`}
    >
      <Field span={{ base: 12, sm: 11 }}>
        <TextInput
          placeholder={t('placeholders.columnTitle')}
          {...form.getInputProps(`footer.columns.${columnIndex}.title`)}
        />
      </Field>
    </RepeatingRow>
  );
}

/** A link inside a footer column: same shape as a nav link, different path. */
export function FooterLinkRow({
  form,
  columnIndex,
  linkIndex,
}: {
  form: WebsiteForm;
  columnIndex: number;
  linkIndex: number;
}) {
  const { t } = useTranslation('website');

  return (
    <RepeatingRow
      onRemove={() => form.removeListItem(`footer.columns.${columnIndex}.links`, linkIndex)}
      removeLabel={`${t('removeFooterLink')} ${columnIndex + 1}.${linkIndex + 1}`}
    >
      <Field span={{ base: 12, sm: 5 }}>
        <TextInput
          placeholder={t('placeholders.navLabel')}
          {...form.getInputProps(`footer.columns.${columnIndex}.links.${linkIndex}.label`)}
        />
      </Field>
      <Field span={{ base: 12, sm: 6 }}>
        <TextInput
          placeholder={t('placeholders.href')}
          {...form.getInputProps(`footer.columns.${columnIndex}.links.${linkIndex}.href`)}
        />
      </Field>
    </RepeatingRow>
  );
}

export function FooterLegalRow({ form, index }: { form: WebsiteForm; index: number }) {
  const { t } = useTranslation('website');

  return (
    <RepeatingRow
      onRemove={() => form.removeListItem('footer.legal', index)}
      removeLabel={`${t('removeFooterLink')} ${index + 1}`}
    >
      <Field span={{ base: 12, sm: 5 }}>
        <TextInput
          placeholder={t('placeholders.navLabel')}
          {...form.getInputProps(`footer.legal.${index}.label`)}
        />
      </Field>
      <Field span={{ base: 12, sm: 6 }}>
        <TextInput
          placeholder={t('placeholders.href')}
          {...form.getInputProps(`footer.legal.${index}.href`)}
        />
      </Field>
    </RepeatingRow>
  );
}
