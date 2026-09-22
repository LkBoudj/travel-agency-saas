import type {
  ActivityRequirements,
  AccommodationType,
  AvailabilityMode,
  FitnessLevel,
  GalleryItem,
  GeographicScope,
  GuidanceType,
  ItineraryItem,
  ParticipationMode,
  TextItem,
  TourActivity,
  TourAudience,
  TourDifficulty,
  TourFormat,
  TourLocation,
  TourTheme,
  TransportMode,
} from '../types.ts';
import { isActivityRequirementsEmpty } from './tour-catalog.ts';

export interface TripPayload {
  name: string;
  internalRef: string | null;
  format: TourFormat;
  geographicScope: GeographicScope;
  availabilityMode: AvailabilityMode;
  participationMode: ParticipationMode | null;
  guidanceType: GuidanceType | null;
  origin: TourLocation;
  destinations: TourLocation[];
  days: number | null;
  nights: number | null;
  hours: number | null;
  isFlexible: boolean;
  languages: string[];
  minTravelers: number;
  themes: TourTheme[];
  activities: TourActivity[];
  audiences: TourAudience[];
  activityRequirements: ActivityRequirements | null;
  transportModes: TransportMode[];
  accommodationTypes: AccommodationType[];
  shortDescription: string | null;
  description: string | null;
  highlights: TextItem[];
  itinerary: ItineraryItem[];
  included: TextItem[];
  notIncluded: TextItem[];
  importantInformation: string | null;
  cancellationPolicy: string | null;
  meetingPoint: string | null;
  meetingInstructions: string | null;
  coverImageUrl: string | null;
  gallery: GalleryItem[];
}

function toNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toLocation(value: { wilayaCode: string; cityId: string; place: string }): TourLocation {
  return {
    wilayaCode: toNullableText(value.wilayaCode),
    cityId: toNullableText(value.cityId),
    place: toNullableText(value.place),
  };
}

function toIntOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function toTextItems(lines: string): { text: string }[] {
  return linesToNonEmpty(lines).map((text) => ({ text }));
}

function toGalleryItems(lines: string): { url: string }[] {
  return linesToNonEmpty(lines).map((url) => ({ url }));
}

function linesToNonEmpty(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function toItinerary(
  rows: readonly { title: string; location: string; description: string }[]
): ItineraryItem[] {
  return rows
    .filter(
      (row) =>
        row.title.trim().length > 0 ||
        row.location.trim().length > 0 ||
        row.description.trim().length > 0
    )
    .map((row) => ({
      title: row.title.trim(),
      location: row.location.trim(),
      description: row.description.trim(),
    }));
}

function toActivityRequirements(input: {
  difficulty: string;
  fitnessLevel: string;
  distanceKm: string;
  elevationGainM: string;
  minimumAge: string;
  requiredEquipment: string;
}): ActivityRequirements | null {
  const result: ActivityRequirements = {
    difficulty: (toNullableText(input.difficulty) as TourDifficulty) ?? null,
    fitnessLevel: (toNullableText(input.fitnessLevel) as FitnessLevel) ?? null,
    distanceKm: toIntOrNull(input.distanceKm),
    elevationGainM: toIntOrNull(input.elevationGainM),
    minimumAge: toIntOrNull(input.minimumAge),
    requiredEquipment: toNullableText(input.requiredEquipment),
  };
  return isActivityRequirementsEmpty(result) ? null : result;
}

function toEnumArray<T extends string>(values: readonly T[]): T[] {
  return values.filter((value): value is T => value.length > 0);
}

/** Query string for the list endpoint (search + optional status filter). */
export function buildTripListQuery(search = '', status?: string): string {
  const params: string[] = [];
  const trimmed = search.trim();
  if (trimmed.length > 0) {
    params.push(`search=${encodeURIComponent(trimmed)}`);
  }
  if (status) {
    params.push(`status=${encodeURIComponent(status)}`);
  }
  return params.length > 0 ? `?${params.join('&')}` : '';
}

export function buildTripPayload(input: {
  name: string;
  internalRef: string;
  format: TourFormat;
  geographicScope: GeographicScope;
  availabilityMode: AvailabilityMode;
  participationMode: string;
  guidanceType: string;
  origin: { wilayaCode: string; cityId: string; place: string };
  destinations: readonly { wilayaCode: string; cityId: string; place: string }[];
  days: string;
  nights: string;
  hours: string;
  isFlexible: boolean;
  minTravelers: string;
  languages: string;
  themes: readonly TourTheme[];
  activities: readonly TourActivity[];
  audiences: readonly TourAudience[];
  transportModes: readonly TransportMode[];
  accommodationTypes: readonly AccommodationType[];
  shortDescription: string;
  description: string;
  highlights: string;
  included: string;
  notIncluded: string;
  itinerary: readonly { title: string; location: string; description: string }[];
  importantInformation: string;
  cancellationPolicy: string;
  meetingPoint: string;
  meetingInstructions: string;
  coverImageUrl: string;
  gallery: string;
  activityRequirements: {
    difficulty: string;
    fitnessLevel: string;
    distanceKm: string;
    elevationGainM: string;
    minimumAge: string;
    requiredEquipment: string;
  };
}): TripPayload {
  const days = toIntOrNull(input.days);
  const hours = toIntOrNull(input.hours);

  return {
    name: input.name.trim(),
    internalRef: toNullableText(input.internalRef),
    format: input.format,
    geographicScope: input.geographicScope,
    availabilityMode: input.availabilityMode,
    participationMode: (toNullableText(input.participationMode) as ParticipationMode) ?? null,
    guidanceType: (toNullableText(input.guidanceType) as GuidanceType) ?? null,
    origin: toLocation(input.origin),
    destinations: input.destinations.map(toLocation),
    days: days == null || days < 1 ? null : days,
    nights: toIntOrNull(input.nights),
    hours: hours == null || hours < 1 ? null : hours,
    isFlexible: input.isFlexible,
    languages: linesToNonEmpty(input.languages),
    minTravelers: toIntOrNull(input.minTravelers) ?? 1,
    themes: toEnumArray(input.themes),
    activities: toEnumArray(input.activities),
    audiences: toEnumArray(input.audiences),
    activityRequirements: toActivityRequirements(input.activityRequirements),
    transportModes: toEnumArray(input.transportModes),
    accommodationTypes: toEnumArray(input.accommodationTypes),
    shortDescription: toNullableText(input.shortDescription),
    description: toNullableText(input.description),
    highlights: toTextItems(input.highlights),
    itinerary: toItinerary(input.itinerary),
    included: toTextItems(input.included),
    notIncluded: toTextItems(input.notIncluded),
    importantInformation: toNullableText(input.importantInformation),
    cancellationPolicy: toNullableText(input.cancellationPolicy),
    meetingPoint: toNullableText(input.meetingPoint),
    meetingInstructions: toNullableText(input.meetingInstructions),
    coverImageUrl: toNullableText(input.coverImageUrl),
    gallery: toGalleryItems(input.gallery),
  };
}
