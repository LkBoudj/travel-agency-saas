import type {
  AccommodationType,
  ActivityRequirements,
  AvailabilityMode,
  FitnessLevel,
  GeographicScope,
  GuidanceType,
  ParticipationMode,
  TourActivity,
  TourAudience,
  TourDifficulty,
  TourFormat,
  TourTheme,
  TransportMode,
} from '../types.ts';

/**
 * Static catalogs for the tour editor. Values MUST mirror the backend enum
 * contracts exactly (they are wired one-to-one with tourPayloadSchema).
 */

export const TOUR_FORMATS: readonly TourFormat[] = [
  'experience',
  'day_excursion',
  'stay',
  'circuit',
  'cruise',
];

export const TOUR_SCOPES: readonly GeographicScope[] = ['domestic', 'international'];

export const TOUR_AVAILABILITY_MODES: readonly AvailabilityMode[] = [
  'scheduled',
  'on_request',
  'custom_quote',
];

export const TOUR_PARTICIPATION_MODES: readonly ParticipationMode[] = [
  'shared_group',
  'private',
  'individual',
];

export const TOUR_GUIDANCE_TYPES: readonly GuidanceType[] = [
  'guided',
  'escorted',
  'self_guided',
  'mixed',
];

export const TOUR_THEMES: readonly TourTheme[] = [
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
];

export const TOUR_ACTIVITIES: readonly TourActivity[] = [
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
];

export const TOUR_AUDIENCES: readonly TourAudience[] = [
  'families',
  'couples',
  'honeymoon',
  'friends',
  'solo',
  'youth',
  'seniors',
  'corporate',
];

export const TOUR_TRANSPORT_MODES: readonly TransportMode[] = [
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
];

export const TOUR_ACCOMMODATION_TYPES: readonly AccommodationType[] = [
  'none',
  'hotel',
  'resort',
  'guesthouse',
  'homestay',
  'camp',
  'mixed',
];

export const TOUR_DIFFICULTIES: readonly TourDifficulty[] = ['easy', 'moderate', 'challenging'];

export const TOUR_FITNESS_LEVELS: readonly FitnessLevel[] = ['basic', 'normal', 'good', 'high'];

export function isActivityRequirementsEmpty(
  requirements: ActivityRequirements | null | undefined
): boolean {
  if (!requirements) {
    return true;
  }
  const { difficulty, distanceKm, elevationGainM, minimumAge, fitnessLevel, requiredEquipment } =
    requirements;
  return (
    difficulty == null &&
    fitnessLevel == null &&
    distanceKm == null &&
    elevationGainM == null &&
    minimumAge == null &&
    requiredEquipment == null
  );
}
