import { useTranslation } from 'react-i18next';
import { useZodForm } from '../../../components/form/use-zod-form.ts';
import { emptyDepartureForm, toDepartureFormValues } from '../lib/departure-payloads.ts';
import { departureSchema, type DepartureFormValues } from '../schemas/departure.schema.ts';
import type { Departure } from '../types.ts';

export { emptyDepartureForm, type DepartureFormValues };

export function departureFormInitialValues(departure: Departure | null): DepartureFormValues {
  if (!departure) {
    return emptyDepartureForm();
  }
  return toDepartureFormValues(departure);
}

export function useDepartureForm(initialValues: DepartureFormValues) {
  const { t } = useTranslation('departures');

  return useZodForm<DepartureFormValues>({
    schema: departureSchema,
    initialValues,
    fieldErrorKeys: {
      startAt: { required: 'fieldErrors.startRequired', invalid: 'fieldErrors.startInvalid' },
      endAt: { required: 'fieldErrors.endRequired', invalid: 'fieldErrors.endAfterStart' },
      capacity: {
        required: 'fieldErrors.capacityRequired',
        invalid: 'fieldErrors.capacityInvalid',
      },
      bookingDeadline: { invalid: 'fieldErrors.deadlineAfterStart' },
      notes: { invalid: 'fieldErrors.notesTooLong' },
    },
    t,
  });
}
