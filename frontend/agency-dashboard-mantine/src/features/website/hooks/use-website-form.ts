import { useTranslation } from 'react-i18next';
import type { UseFormReturnType } from '@mantine/form';
import { useZodForm } from '../../../components/form/use-zod-form.ts';
import { websiteFormSchema, type WebsiteFormValues } from '../schemas/website.schema.ts';

export type WebsiteForm = UseFormReturnType<WebsiteFormValues>;

export function useWebsiteForm(initialValues: WebsiteFormValues): WebsiteForm {
  const { t } = useTranslation('website');

  return useZodForm<WebsiteFormValues>({
    schema: websiteFormSchema,
    initialValues,
    fieldErrorKeys: {
      hero: { required: 'fieldErrors.heroTitleRequired', invalid: 'fieldErrors.heroTitleTooLong' },
      trustPoints: {
        required: 'fieldErrors.trustPointTitleRequired',
        invalid: 'fieldErrors.trustPointTooMany',
      },
      promotion: { invalid: 'fieldErrors.valueTooLong' },
      testimonials: {
        required: 'fieldErrors.testimonialRequired',
        invalid: 'fieldErrors.testimonialTooMany',
      },
      finalCta: { invalid: 'fieldErrors.valueTooLong' },
      branding: {
        required: 'fieldErrors.brandingNameRequired',
        invalid: 'fieldErrors.brandingNameTooLong',
      },
      navigation: {
        required: 'fieldErrors.navigationLinkRequired',
        invalid: 'fieldErrors.navigationTooMany',
      },
      footer: {
        required: 'fieldErrors.footerColumnTitleRequired',
        invalid: 'fieldErrors.footerTooMany',
      },
    },
    t,
  });
}
