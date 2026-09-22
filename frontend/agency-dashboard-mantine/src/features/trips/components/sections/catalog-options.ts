import {
  TOUR_ACCOMMODATION_TYPES,
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
} from '../../lib/tour-catalog.ts';

export interface CatalogOptions {
  formats: { value: string; label: string }[];
  scopes: { value: string; label: string }[];
  modes: { value: string; label: string }[];
  participations: { value: string; label: string }[];
  guidance: { value: string; label: string }[];
  difficulties: { value: string; label: string }[];
  fitness: { value: string; label: string }[];
  themes: { value: string; label: string }[];
  activities: { value: string; label: string }[];
  audiences: { value: string; label: string }[];
  transports: { value: string; label: string }[];
  accommodations: { value: string; label: string }[];
}

export function buildCatalogOptions(t: (key: string) => string): CatalogOptions {
  const toOptions = (values: readonly string[], prefix: string) =>
    values.map((value) => ({ value, label: t(`${prefix}.${value}`) }));
  return {
    formats: toOptions(TOUR_FORMATS, 'catalog.formats'),
    scopes: toOptions(TOUR_SCOPES, 'catalog.scopes'),
    modes: toOptions(TOUR_AVAILABILITY_MODES, 'catalog.modes'),
    participations: toOptions(TOUR_PARTICIPATION_MODES, 'catalog.participations'),
    guidance: toOptions(TOUR_GUIDANCE_TYPES, 'catalog.guidance'),
    difficulties: toOptions(TOUR_DIFFICULTIES, 'catalog.difficulties'),
    fitness: toOptions(TOUR_FITNESS_LEVELS, 'catalog.fitness'),
    themes: toOptions(TOUR_THEMES, 'catalog.themes'),
    activities: toOptions(TOUR_ACTIVITIES, 'catalog.activities'),
    audiences: toOptions(TOUR_AUDIENCES, 'catalog.audiences'),
    transports: toOptions(TOUR_TRANSPORT_MODES, 'catalog.transports'),
    accommodations: toOptions(TOUR_ACCOMMODATION_TYPES, 'catalog.accommodations'),
  };
}
