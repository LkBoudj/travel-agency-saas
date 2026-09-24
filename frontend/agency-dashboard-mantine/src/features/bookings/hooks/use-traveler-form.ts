import { useTranslation } from 'react-i18next';
import { useZodForm } from '../../../components/form/use-zod-form.ts';
import { travelerFormSchema, type TravelerFormValues } from '../schemas/booking.schema.ts';
import type { BookingTraveler } from '../types.ts';

export const EMPTY_TRAVELER_FORM: TravelerFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: '',
};

/** Prefills the traveler form from an existing record (edit mode). */
export function travelerFormInitialValues(traveler: BookingTraveler | null): TravelerFormValues {
  if (!traveler) {
    return EMPTY_TRAVELER_FORM;
  }
  return {
    firstName: traveler.firstName,
    lastName: traveler.lastName,
    email: traveler.email ?? '',
    phone: traveler.phone ?? '',
    notes: traveler.notes ?? '',
  };
}

export function useTravelerForm(initialValues: TravelerFormValues) {
  const { t } = useTranslation('bookings');

  return useZodForm<TravelerFormValues>({
    schema: travelerFormSchema,
    initialValues,
    fieldErrorKeys: {
      firstName: {
        required: 'travelers.validation.firstNameRequired',
        invalid: 'travelers.validation.nameMax',
      },
      lastName: {
        required: 'travelers.validation.lastNameRequired',
        invalid: 'travelers.validation.nameMax',
      },
      email: { invalid: 'travelers.validation.emailInvalid' },
      phone: { invalid: 'travelers.validation.phoneMax' },
      notes: { invalid: 'travelers.validation.notesMax' },
    },
    t,
  });
}
