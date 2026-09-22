import { z } from 'zod';
import {
  TOUR_ACTIVITIES,
  TOUR_AUDIENCES,
  TOUR_AVAILABILITY_MODES,
  TOUR_DIFFICULTIES,
  TOUR_FITNESS_LEVELS,
  TOUR_FORMATS,
  TOUR_GUIDANCE_TYPES,
  TOUR_PARTICIPATION_MODES,
  TOUR_SCOPES,
  TOUR_THEMES,
  TOUR_TRANSPORT_MODES,
  TOUR_ACCOMMODATION_TYPES,
} from '../lib/tour-catalog.ts';
import type {
  AvailabilityMode,
  FitnessLevel,
  GeographicScope,
  TourActivity,
  TourAudience,
  TourDifficulty,
  TourFormat,
  TourTheme,
  TransportMode,
  AccommodationType,
} from '../types.ts';

export interface TourLocationFormValue {
  wilayaCode: string;
  cityId: string;
  place: string;
}

export interface ItineraryRowFormValue {
  title: string;
  location: string;
  description: string;
}

export interface ActivityRequirementsFormValue {
  difficulty: '' | TourDifficulty;
  fitnessLevel: '' | FitnessLevel;
  distanceKm: string;
  elevationGainM: string;
  minimumAge: string;
  requiredEquipment: string;
}

export type TripFormValues = z.infer<typeof tripFormSchema>;

const locationFormSchema = z.object({
  wilayaCode: z.string(),
  cityId: z.string(),
  place: z.string(),
});

const itineraryRowSchema = z.object({
  title: z.string().max(200),
  location: z.string().max(200),
  description: z.string().max(10000),
});

const integerField = (max: number) => z.string().trim().max(max).regex(/^\d*$/, 'digits');

const selectOrEmpty = <T extends string>(values: readonly T[]) =>
  z.union([z.literal(''), z.enum(values as [T, ...T[]])]);

export const tripFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  internalRef: z.string().trim().max(80),
  format: z.enum(TOUR_FORMATS as [TourFormat, ...TourFormat[]]),
  geographicScope: z.enum(TOUR_SCOPES as [GeographicScope, ...GeographicScope[]]),
  availabilityMode: z.enum(TOUR_AVAILABILITY_MODES as [AvailabilityMode, ...AvailabilityMode[]]),
  participationMode: selectOrEmpty(TOUR_PARTICIPATION_MODES),
  guidanceType: selectOrEmpty(TOUR_GUIDANCE_TYPES),
  origin: locationFormSchema,
  destinations: z.array(locationFormSchema).min(1).max(50),
  days: integerField(4),
  nights: integerField(4),
  hours: integerField(4),
  isFlexible: z.boolean(),
  minTravelers: integerField(4),
  languages: z.string().max(2000),
  themes: z.array(z.enum(TOUR_THEMES as [TourTheme, ...TourTheme[]])).max(14),
  activities: z.array(z.enum(TOUR_ACTIVITIES as [TourActivity, ...TourActivity[]])).max(23),
  audiences: z.array(z.enum(TOUR_AUDIENCES as [TourAudience, ...TourAudience[]])).max(8),
  transportModes: z
    .array(z.enum(TOUR_TRANSPORT_MODES as [TransportMode, ...TransportMode[]]))
    .max(12),
  accommodationTypes: z
    .array(z.enum(TOUR_ACCOMMODATION_TYPES as [AccommodationType, ...AccommodationType[]]))
    .max(7),
  shortDescription: z.string().max(160),
  description: z.string().max(100000),
  highlights: z.string().max(60_000),
  included: z.string().max(60_000),
  notIncluded: z.string().max(60_000),
  itinerary: z.array(itineraryRowSchema).max(30),
  importantInformation: z.string().max(100000),
  cancellationPolicy: z.string().max(100000),
  meetingPoint: z.string().max(500),
  meetingInstructions: z.string().max(2000),
  coverImageUrl: z.string().max(2048),
  gallery: z.string().max(100_000),
  activityRequirements: z.object({
    difficulty: selectOrEmpty(TOUR_DIFFICULTIES),
    fitnessLevel: selectOrEmpty(TOUR_FITNESS_LEVELS),
    distanceKm: integerField(6),
    elevationGainM: integerField(6),
    minimumAge: integerField(4),
    requiredEquipment: z.string().max(500),
  }),
});

export function emptyTripFormValues(): TripFormValues {
  return {
    name: '',
    internalRef: '',
    format: 'experience',
    geographicScope: 'domestic',
    availabilityMode: 'scheduled',
    participationMode: '',
    guidanceType: '',
    origin: { wilayaCode: '', cityId: '', place: '' },
    destinations: [{ wilayaCode: '', cityId: '', place: '' }],
    days: '',
    nights: '',
    hours: '',
    isFlexible: false,
    minTravelers: '1',
    languages: '',
    themes: [],
    activities: [],
    audiences: [],
    transportModes: [],
    accommodationTypes: [],
    shortDescription: '',
    description: '',
    highlights: '',
    included: '',
    notIncluded: '',
    itinerary: [],
    importantInformation: '',
    cancellationPolicy: '',
    meetingPoint: '',
    meetingInstructions: '',
    coverImageUrl: '',
    gallery: '',
    activityRequirements: {
      difficulty: '',
      fitnessLevel: '',
      distanceKm: '',
      elevationGainM: '',
      minimumAge: '',
      requiredEquipment: '',
    },
  };
}
