export type TourStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type TourFormat = 'experience' | 'day_excursion' | 'stay' | 'circuit' | 'cruise';
export type GeographicScope = 'domestic' | 'international';
export type AvailabilityMode = 'scheduled' | 'on_request' | 'custom_quote';
export type ParticipationMode = 'shared_group' | 'private' | 'individual';
export type GuidanceType = 'guided' | 'escorted' | 'self_guided' | 'mixed';
export type TourDifficulty = 'easy' | 'moderate' | 'challenging';
export type FitnessLevel = 'basic' | 'normal' | 'good' | 'high';

export type TourTheme =
  | 'nature'
  | 'mountain'
  | 'sahara_desert'
  | 'beach_coastal'
  | 'cultural'
  | 'heritage_history'
  | 'religious_spiritual'
  | 'wellness'
  | 'adventure'
  | 'eco_tourism'
  | 'urban_city'
  | 'gastronomy'
  | 'festival_event'
  | 'luxury';

export type TourActivity =
  | 'hiking'
  | 'trekking'
  | 'walking_tour'
  | 'sightseeing'
  | 'guided_visit'
  | 'museum_archaeology'
  | 'camping'
  | 'offroad_4x4'
  | 'camel_trek'
  | 'cycling'
  | 'horse_riding'
  | 'boat_trip'
  | 'swimming_beach'
  | 'fishing'
  | 'skiing_snow'
  | 'climbing'
  | 'kayaking'
  | 'diving'
  | 'wellness_hammam'
  | 'craft_workshop'
  | 'food_tasting'
  | 'photography'
  | 'festival';

export type TourAudience =
  | 'families'
  | 'couples'
  | 'honeymoon'
  | 'friends'
  | 'solo'
  | 'youth'
  | 'seniors'
  | 'corporate';

export type TransportMode =
  | 'bus'
  | 'minibus'
  | 'car'
  | 'flight'
  | 'train'
  | 'boat'
  | 'offroad_4x4'
  | 'camel'
  | 'bicycle'
  | 'walking'
  | 'self_drive'
  | 'mixed';

export type AccommodationType =
  | 'none'
  | 'hotel'
  | 'resort'
  | 'guesthouse'
  | 'homestay'
  | 'camp'
  | 'mixed';

/** Backend readiness blockers surfaced on a blocked publish attempt. */
export type TourPublishBlocker =
  | 'NAME'
  | 'DESTINATION'
  | 'SHORT_DESCRIPTION'
  | 'COVER_IMAGE'
  | 'SCHEDULED_DEPARTURES_REQUIRED';

export interface TourLocation {
  wilayaCode: string | null;
  cityId: string | null;
  place: string | null;
}

export interface ActivityRequirements {
  difficulty?: TourDifficulty | null;
  distanceKm?: number | null;
  elevationGainM?: number | null;
  minimumAge?: number | null;
  fitnessLevel?: FitnessLevel | null;
  requiredEquipment?: string | null;
}

export interface ItineraryItem {
  title: string;
  location: string;
  description: string;
}

export interface TextItem {
  text: string;
}

export interface GalleryItem {
  url: string;
}

export interface Tour {
  code: string;
  status: TourStatus;
  startingPrice: number | null;
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
  createdAt: string;
  updatedAt: string;
}

/** Row shape returned by the list endpoint (lean, no long texts). */
export interface TourListRow {
  code: string;
  name: string;
  internalRef: string | null;
  status: TourStatus;
  coverImageUrl: string | null;
  format: TourFormat;
  geographicScope: GeographicScope;
  availabilityMode: AvailabilityMode;
  days: number | null;
  nights: number | null;
  hours: number | null;
  destinations: TourLocation[];
  startingPrice: number | null;
  createdAt: string;
  updatedAt: string;
}
