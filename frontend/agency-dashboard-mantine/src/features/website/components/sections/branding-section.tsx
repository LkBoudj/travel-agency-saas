import { useTranslation } from 'react-i18next';
import { Avatar, Stack, TextInput } from '@mantine/core';
import { FormSection } from '../../../../components/form/form-section.tsx';
import type { WebsiteForm } from '../../hooks/use-website-form.ts';

export interface BrandingSectionProps {
  form: WebsiteForm;
}

export function BrandingSection({ form }: BrandingSectionProps) {
  const { t } = useTranslation('website');

  return (
    <FormSection title={t('sections.branding')} description={t('sectionHints.branding')}>
      <Stack gap="sm">
        <TextInput label={t('fields.brandName')} {...form.getInputProps('branding.name')} />
        <TextInput label={t('fields.tagline')} {...form.getInputProps('branding.tagline')} />
        <TextInput
          label={t('fields.logoUrl')}
          placeholder={t('placeholders.image')}
          {...form.getInputProps('branding.logo')}
        />
        {form.values.branding.logo.trim().length > 0 ? (
          <Avatar
            src={form.values.branding.logo.trim()}
            size="xl"
            radius="md"
            imageProps={{ referrerPolicy: 'no-referrer' }}
          />
        ) : null}
      </Stack>
    </FormSection>
  );
}
