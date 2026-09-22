import { useTranslation } from 'react-i18next';
import { useZodForm } from '../../../components/form/use-zod-form.ts';
import {
  emptyTripFormValues,
  tripFormSchema,
  type TripFormValues,
} from '../schemas/tour.schema.ts';
import type { Tour, TourLocation } from '../types.ts';

export { emptyTripFormValues, type TripFormValues };

function textItemsToLines(items: { text: string }[]): string {
  return items.map((item) => item.text).join('\n');
}

function galleryToLines(items: { url: string }[]): string {
  return items.map((item) => item.url).join('\n');
}

function locationToForm(location: TourLocation): {
  wilayaCode: string;
  cityId: string;
  place: string;
} {
  return {
    wilayaCode: location.wilayaCode ?? '',
    cityId: location.cityId ?? '',
    place: location.place ?? '',
  };
}

function numberToString(value: number | null | undefined): string {
  return value == null ? '' : String(value);
}

export function tripToFormValues(tour: Tour): TripFormValues {
  const requirements = tour.activityRequirements;
  return {
    name: tour.name,
    internalRef: tour.internalRef ?? '',
    format: tour.format,
    geographicScope: tour.geographicScope,
    availabilityMode: tour.availabilityMode,
    participationMode: tour.participationMode ?? '',
    guidanceType: tour.guidanceType ?? '',
    origin: locationToForm(tour.origin),
    destinations: tour.destinations.map(locationToForm),
    days: numberToString(tour.days),
    nights: numberToString(tour.nights),
    hours: numberToString(tour.hours),
    isFlexible: tour.isFlexible,
    minTravelers: String(tour.minTravelers ?? 1),
    languages: tour.languages.join('\n'),
    themes: tour.themes,
    activities: tour.activities,
    audiences: tour.audiences,
    transportModes: tour.transportModes,
    accommodationTypes: tour.accommodationTypes,
    shortDescription: tour.shortDescription ?? '',
    description: tour.description ?? '',
    highlights: textItemsToLines(tour.highlights),
    included: textItemsToLines(tour.included),
    notIncluded: textItemsToLines(tour.notIncluded),
    itinerary: tour.itinerary.map((item) => ({
      title: item.title,
      location: item.location,
      description: item.description,
    })),
    importantInformation: tour.importantInformation ?? '',
    cancellationPolicy: tour.cancellationPolicy ?? '',
    meetingPoint: tour.meetingPoint ?? '',
    meetingInstructions: tour.meetingInstructions ?? '',
    coverImageUrl: tour.coverImageUrl ?? '',
    gallery: galleryToLines(tour.gallery),
    activityRequirements: {
      difficulty: requirements?.difficulty ?? '',
      fitnessLevel: requirements?.fitnessLevel ?? '',
      distanceKm: numberToString(requirements?.distanceKm),
      elevationGainM: numberToString(requirements?.elevationGainM),
      minimumAge: numberToString(requirements?.minimumAge),
      requiredEquipment: requirements?.requiredEquipment ?? '',
    },
  };
}

export function useTripForm(initialValues: TripFormValues) {
  const { t } = useTranslation('trips');

  return useZodForm<TripFormValues>({
    schema: tripFormSchema,
    initialValues,
    fieldErrorKeys: {
      name: { required: 'fieldErrors.nameRequired', invalid: 'fieldErrors.nameTooLong' },
      internalRef: { invalid: 'fieldErrors.nameTooLong' },
      destinations: {
        required: 'fieldErrors.destinationRequired',
        invalid: 'fieldErrors.destinationsTooMany',
      },
      shortDescription: { invalid: 'fieldErrors.shortDescriptionTooLong' },
      coverImageUrl: { invalid: 'fieldErrors.urlTooLong' },
    },
    t,
  });
}
