import type { QuickCreateFormValues } from '../schemas/quick-create.schema.ts';
import { emptyTripFormValues, type TripFormValues } from '../schemas/tour.schema.ts';

/** Folds the quick-create fields into a full EditorFormValues with defaults. */
export function quickCreateToTripFormValues(values: QuickCreateFormValues): TripFormValues {
  const base = emptyTripFormValues();
  const destinationPlace = values.destinationPlace.trim();
  return {
    ...base,
    name: values.name.trim(),
    format: values.format,
    geographicScope: values.geographicScope,
    availabilityMode: values.availabilityMode,
    destinations:
      destinationPlace.length > 0
        ? [{ wilayaCode: '', cityId: '', place: destinationPlace }]
        : base.destinations,
    days: values.days,
    nights: values.nights,
    hours: values.hours,
  };
}
