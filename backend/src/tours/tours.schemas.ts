import { z } from 'zod';

/**
 * Module F aggregate contracts.
 *
 * Create and update share ONE contract: the full Tour aggregate (the product
 * template). `PUT` is a full replacement — destinations and itinerary are
 * re-created in the same transaction. Status is NOT part of the payload: it is
 * moved only by the explicit publish / unpublish / archive actions.
 *
 * Departures, prices and extras belong to later modules (G/H) and are
 * deliberately absent here; the client drops them before sending.
 */

/** A blank string is treated as "no value", never stored as a stub. */
const emptyToNull = (value: unknown): unknown =>
  typeof value === 'string' && value.trim().length === 0 ? null : value;

const nullableText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.union([z.literal(null), z.string().trim().min(1).max(max)]),
  );

/**
 * Structured location, kept verbatim from the dashboard's location draft:
 * `wilayaCode` (domestic), free-text `cityId`/commune, and `place` (specific
 * spot, or the destination itself for international). The backend stores and
 * echoes it without ever resolving labels.
 */
const tourLocationSchema = z
  .object({
    wilayaCode: nullableText(8).nullish(),
    cityId: nullableText(120).nullish(),
    place: nullableText(200).nullish(),
  })
  .strict();

const textItemSchema = z
  .object({ text: z.string().trim().min(1).max(500) })
  .strict();

const galleryItemSchema = z
  .object({ url: z.string().trim().min(1).max(2048) })
  .strict();

const itineraryDaySchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    location: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(10000),
  })
  .strict();

const activityRequirementsSchema = z
  .object({
    difficulty: z.enum(['easy', 'moderate', 'challenging']).nullish(),
    distanceKm: z.number().int().nonnegative().nullable().optional(),
    elevationGainM: z.number().int().nonnegative().nullable().optional(),
    minimumAge: z.number().int().nonnegative().nullable().optional(),
    fitnessLevel: z.enum(['basic', 'normal', 'good', 'high']).nullish(),
    requiredEquipment: z
      .preprocess(emptyToNull, z.string().trim().max(500).nullable().optional()),
  })
  .strict()
  .nullish();

export const TOUR_FORMATS = [
  'experience',
  'day_excursion',
  'stay',
  'circuit',
  'cruise',
] as const;

export const TOUR_SCOPES = ['domestic', 'international'] as const;

export const TOUR_AVAILABILITY_MODES = [
  'scheduled',
  'on_request',
  'custom_quote',
] as const;

export const TOUR_THEMES = [
  'nature',
  'mountain',
  'sahara_desert',
  'beach_coastal',
  'cultural',
  'heritage_history',
  'religious_spiritual',
  'wellness',
  'adventure',
  'eco_tourism',
  'urban_city',
  'gastronomy',
  'festival_event',
  'luxury',
] as const;

export const TOUR_ACTIVITIES = [
  'hiking',
  'trekking',
  'walking_tour',
  'sightseeing',
  'guided_visit',
  'museum_archaeology',
  'camping',
  'offroad_4x4',
  'camel_trek',
  'cycling',
  'horse_riding',
  'boat_trip',
  'swimming_beach',
  'fishing',
  'skiing_snow',
  'climbing',
  'kayaking',
  'diving',
  'wellness_hammam',
  'craft_workshop',
  'food_tasting',
  'photography',
  'festival',
] as const;

export const TOUR_AUDIENCES = [
  'families',
  'couples',
  'honeymoon',
  'friends',
  'solo',
  'youth',
  'seniors',
  'corporate',
] as const;

export const TOUR_TRANSPORT_MODES = [
  'bus',
  'minibus',
  'car',
  'flight',
  'train',
  'boat',
  'offroad_4x4',
  'camel',
  'bicycle',
  'walking',
  'self_drive',
  'mixed',
] as const;

export const TOUR_ACCOMMODATION_TYPES = [
  'none',
  'hotel',
  'resort',
  'guesthouse',
  'homestay',
  'camp',
  'mixed',
] as const;

export const tourPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    internalRef: nullableText(80),
    format: z.enum(TOUR_FORMATS),
    geographicScope: z.enum(TOUR_SCOPES),
    availabilityMode: z.enum(TOUR_AVAILABILITY_MODES),
    participationMode: z.enum(['shared_group', 'private', 'individual']).nullish(),
    guidanceType: z.enum(['guided', 'escorted', 'self_guided', 'mixed']).nullish(),
    origin: tourLocationSchema.default(() => ({
      wilayaCode: null,
      cityId: null,
      place: null,
    })),
    destinations: z.array(tourLocationSchema).min(1).max(50),
    days: z.number().int().positive().nullable().optional(),
    nights: z.number().int().nonnegative().nullable().optional(),
    hours: z.number().int().positive().nullable().optional(),
    isFlexible: z.boolean().default(false),
    languages: z.array(z.string().trim().min(1).max(40)).default([]),
    minTravelers: z.number().int().nonnegative().default(1),
    themes: z.array(z.enum(TOUR_THEMES)).default([]),
    activities: z.array(z.enum(TOUR_ACTIVITIES)).default([]),
    audiences: z.array(z.enum(TOUR_AUDIENCES)).default([]),
    activityRequirements: activityRequirementsSchema,
    transportModes: z.array(z.enum(TOUR_TRANSPORT_MODES)).default([]),
    accommodationTypes: z.array(z.enum(TOUR_ACCOMMODATION_TYPES)).default([]),
    shortDescription: nullableText(160),
    description: nullableText(100000),
    highlights: z.array(textItemSchema).default([]),
    itinerary: z.array(itineraryDaySchema).default([]),
    included: z.array(textItemSchema).default([]),
    notIncluded: z.array(textItemSchema).default([]),
    importantInformation: nullableText(100000),
    cancellationPolicy: nullableText(100000),
    meetingPoint: nullableText(500),
    meetingInstructions: nullableText(2000),
    coverImageUrl: nullableText(2048),
    gallery: z.array(galleryItemSchema).default([]),
  })
  .strict();

export type TourPayload = z.infer<typeof tourPayloadSchema>;

export const createTourSchema = tourPayloadSchema;
export const updateTourSchema = tourPayloadSchema;

export type CreateTourBody = TourPayload;
export type UpdateTourBody = TourPayload;

export const listToursQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
});

export type ListToursQuery = z.infer<typeof listToursQuerySchema>;