import { useTranslation } from 'react-i18next';
import { useZodForm } from '../../../components/form/use-zod-form.ts';
import { createBookingFormSchema, type BookingFormValues } from '../schemas/booking.schema.ts';

export const EMPTY_BOOKING_FORM: BookingFormValues = {
  customerCode: '',
  tourCode: '',
  departureCode: '',
  reservedSeats: '',
  pricingSelections: [],
  notes: '',
};

export function useBookingForm(initialValues: BookingFormValues = EMPTY_BOOKING_FORM) {
  const { t } = useTranslation('bookings');

  return useZodForm<BookingFormValues>({
    schema: createBookingFormSchema,
    initialValues,
    fieldErrorKeys: {
      customerCode: { required: 'validation.customerRequired' },
      tourCode: { required: 'validation.tourRequired' },
      departureCode: { required: 'validation.departureRequired' },
      reservedSeats: {
        required: 'validation.seatsRequired',
        invalid: 'validation.seatsInvalid',
      },
      pricingSelections: { invalid: 'validation.pricingInvalid' },
      notes: { invalid: 'validation.notesMax' },
    },
    t,
  });
}
