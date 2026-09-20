import type { Prisma } from '../generated/prisma/client.js';

/** Lifecycle vocabulary enforced by the `tour_status_check` constraint. */
export type TourStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

/** One structured location on the wire (identical for origin and destinations). */
export interface TourLocation {
  wilayaCode: string | null;
  cityId: string | null;
  place: string | null;
}

export interface TourItineraryDayResponse {
  title: string;
  location: string;
  description: string;
}

export interface TextItem {
  text: string;
}

/**
 * The public shape of a tour record.
 *
 * No database id and no `agency_id` in the contract: `code` is the only stable
 * external key (`TUR-...`) and tenancy is the `:agencyCode` the service already
 * scopes by. Status moves only through publish / unpublish / archive actions.
 */
export interface TourResponse {
  code: string;
  name: string;
  internalRef: string | null;
  status: TourStatus;
  format: string;
  geographicScope: string;
  availabilityMode: string;
  participationMode: string | null;
  guidanceType: string | null;
  days: number | null;
  nights: number | null;
  hours: number | null;
  isFlexible: boolean;
  minTravelers: number;
  languages: string[];
  themes: string[];
  activities: string[];
  audiences: string[];
  activityRequirements: Record<string, unknown> | null;
  transportModes: string[];
  accommodationTypes: string[];
  shortDescription: string | null;
  description: string | null;
  highlights: TextItem[];
  itinerary: TourItineraryDayResponse[];
  included: TextItem[];
  notIncluded: TextItem[];
  importantInformation: string | null;
  cancellationPolicy: string | null;
  meetingPoint: string | null;
  meetingInstructions: string | null;
  coverImageUrl: string | null;
  gallery: Array<{ url: string }>;
  origin: TourLocation;
  destinations: TourLocation[];
  /** Minimum price among the tour's OPEN departures, or null when none. */
  startingPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Light list shape for the trips management table: enough to render rows and
 * the selected filters, without the long copy blocks.
 */
export interface TourListResponse {
  code: string;
  name: string;
  internalRef: string | null;
  status: TourStatus;
  coverImageUrl: string | null;
  format: string;
  geographicScope: string;
  availabilityMode: string;
  days: number | null;
  nights: number | null;
  hours: number | null;
  destinations: TourLocation[];
  /** Minimum price among the tour's OPEN departures, or null when none. */
  startingPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

const destinationSelect = {
  wilayaCode: true,
  locality: true,
  place: true,
} as const;

export const TOUR_LIST_SELECT = {
  id: true,
  code: true,
  name: true,
  internalRef: true,
  status: true,
  coverImageUrl: true,
  format: true,
  geographicScope: true,
  availabilityMode: true,
  days: true,
  nights: true,
  hours: true,
  createdAt: true,
  updatedAt: true,
  destinations: { orderBy: { position: 'asc' as const }, select: destinationSelect },
} as const satisfies Prisma.TourSelect;

export const TOUR_SELECT = {
  ...TOUR_LIST_SELECT,
  participationMode: true,
  guidanceType: true,
  isFlexible: true,
  languages: true,
  minTravelers: true,
  themes: true,
  activities: true,
  audiences: true,
  transportModes: true,
  accommodationTypes: true,
  activityRequirements: true,
  shortDescription: true,
  description: true,
  highlights: true,
  included: true,
  notIncluded: true,
  importantInformation: true,
  cancellationPolicy: true,
  meetingPoint: true,
  meetingInstructions: true,
  gallery: true,
  origin: true,
  itinerary: {
    orderBy: { position: 'asc' as const },
    select: { title: true, location: true, description: true },
  },
} as const satisfies Prisma.TourSelect;

export type TourListRow = Prisma.TourGetPayload<{ select: typeof TOUR_LIST_SELECT }>;
export type TourRow = Prisma.TourGetPayload<{ select: typeof TOUR_SELECT }>;

type DestinationRowShape = { wilayaCode: string | null; locality: string | null; place: string | null };

function readLocation(value: DestinationRowShape): TourLocation {
  return {
    wilayaCode: value.wilayaCode,
    cityId: value.locality,
    place: value.place,
  };
}

/** The origin is stored as a self-contained JSON location (no label resolution). */
function readOrigin(value: Prisma.JsonValue | null): TourLocation {
  if (!value || typeof value !== 'object') {
    return { wilayaCode: null, cityId: null, place: null };
  }
  const record = value as Record<string, unknown>;
  return {
    wilayaCode: typeof record.wilayaCode === 'string' ? record.wilayaCode : null,
    cityId: typeof record.cityId === 'string' ? record.cityId : null,
    place: typeof record.place === 'string' ? record.place : null,
  };
}

/** Normalizes a JSON list of `{text}` items into stable response items. */
function readTextItems(value: Prisma.JsonValue | null | undefined): TextItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
    return {
      text: typeof record?.text === 'string' ? record.text : '',
    };
  });
}

/** Normalizes a JSON list of `{url}` items into the gallery response shape. */
function readGallery(value: Prisma.JsonValue | null | undefined): Array<{ url: string }> {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
    return { url: typeof record?.url === 'string' ? record.url : '' };
  });
}

export function toTourListResponse(
  tour: TourListRow,
  startingPrice: number | null = null,
): TourListResponse {
  return {
    code: tour.code,
    name: tour.name,
    internalRef: tour.internalRef,
    status: tour.status as TourStatus,
    coverImageUrl: tour.coverImageUrl,
    format: tour.format,
    geographicScope: tour.geographicScope,
    availabilityMode: tour.availabilityMode,
    days: tour.days,
    nights: tour.nights,
    hours: tour.hours,
    destinations: tour.destinations.map(readLocation),
    startingPrice,
    createdAt: tour.createdAt.toISOString(),
    updatedAt: tour.updatedAt.toISOString(),
  };
}

export function toTourResponse(tour: TourRow, startingPrice: number | null = null): TourResponse {
  return {
    ...toTourListResponse(tour, startingPrice),
    participationMode: tour.participationMode,
    guidanceType: tour.guidanceType,
    isFlexible: tour.isFlexible,
    languages: tour.languages,
    minTravelers: tour.minTravelers,
    themes: tour.themes,
    activities: tour.activities,
    audiences: tour.audiences,
    activityRequirements:
      tour.activityRequirements && typeof tour.activityRequirements === 'object'
        ? (tour.activityRequirements as Record<string, unknown>)
        : null,
    transportModes: tour.transportModes,
    accommodationTypes: tour.accommodationTypes,
    shortDescription: tour.shortDescription,
    description: tour.description,
    highlights: readTextItems(tour.highlights),
    itinerary: tour.itinerary.map((day) => ({
      title: day.title,
      location: day.location,
      description: day.description,
    })),
    included: readTextItems(tour.included),
    notIncluded: readTextItems(tour.notIncluded),
    importantInformation: tour.importantInformation,
    cancellationPolicy: tour.cancellationPolicy,
    meetingPoint: tour.meetingPoint,
    meetingInstructions: tour.meetingInstructions,
    coverImageUrl: tour.coverImageUrl,
    gallery: readGallery(tour.gallery),
    origin: readOrigin(tour.origin),
  };
}