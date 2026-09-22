import { z } from 'zod';
import { TOUR_AVAILABILITY_MODES, TOUR_FORMATS, TOUR_SCOPES } from '../lib/tour-catalog.ts';
import type { AvailabilityMode, GeographicScope, TourFormat } from '../types.ts';

export interface QuickCreateFormValues {
  name: string;
  format: TourFormat;
  geographicScope: GeographicScope;
  availabilityMode: AvailabilityMode;
  destinationPlace: string;
  days: string;
  nights: string;
  hours: string;
}

const integerField = (max: number) => z.string().trim().max(max).regex(/^\d*$/, 'digits');

export const quickCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  format: z.enum(TOUR_FORMATS as [TourFormat, ...TourFormat[]]),
  geographicScope: z.enum(TOUR_SCOPES as [GeographicScope, ...GeographicScope[]]),
  availabilityMode: z.enum(TOUR_AVAILABILITY_MODES as [AvailabilityMode, ...AvailabilityMode[]]),
  destinationPlace: z.string().trim().max(200),
  days: integerField(4),
  nights: integerField(4),
  hours: integerField(4),
});

export type QuickCreateFormValuesChecked = z.infer<typeof quickCreateSchema>;

export function emptyQuickCreateFormValues(): QuickCreateFormValues {
  return {
    name: '',
    format: 'experience',
    geographicScope: 'domestic',
    availabilityMode: 'scheduled',
    destinationPlace: '',
    days: '',
    nights: '',
    hours: '',
  };
}
