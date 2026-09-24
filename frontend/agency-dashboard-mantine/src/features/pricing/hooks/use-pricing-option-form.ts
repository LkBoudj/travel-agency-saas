import { useTranslation } from 'react-i18next';
import { useZodForm } from '../../../components/form/use-zod-form.ts';
import { emptyPricingOptionForm, toPricingOptionFormValues } from '../lib/pricing-payloads.ts';
import {
  pricingOptionCreateSchema,
  type PricingOptionFormValues,
} from '../schemas/pricing-option.schema.ts';
import type { PricingOption } from '../types.ts';

export { emptyPricingOptionForm, type PricingOptionFormValues };

export function pricingOptionFormInitialValues(
  option: PricingOption | null
): PricingOptionFormValues {
  if (!option) {
    return emptyPricingOptionForm();
  }
  return toPricingOptionFormValues(option);
}

/**
 * Create/edit one pricing option. The single schema covers both modes: the
 * edit dialog just ignores `currency` (immutable after creation) and `status`.
 * Editing keeps currency visible but read-only.
 */
export function usePricingOptionForm(initialValues: PricingOptionFormValues) {
  const { t } = useTranslation('pricing');

  return useZodForm<PricingOptionFormValues>({
    schema: pricingOptionCreateSchema,
    initialValues,
    fieldErrorKeys: {
      name: { required: 'fields.nameRequired', invalid: 'fields.nameTooLong' },
      description: { invalid: 'fields.descriptionTooLong' },
      currency: { invalid: 'fields.currencyInvalid' },
    },
    t,
  });
}
