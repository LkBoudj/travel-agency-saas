import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardPaths } from '../../../app/router/route-paths.ts';
import { useAgencyContext } from '../../agency-context/provider/agency-provider.tsx';
import { usePricingCapabilities } from '../../pricing/hooks/use-pricing-capabilities.ts';
import { useTripCapabilities } from '../../trips/hooks/use-tour-capabilities.ts';
import { useTours } from '../../trips/hooks/use-tours.ts';
import type { TourListRow } from '../../trips/types.ts';
import { useDepartureCapabilities } from './use-departure-capabilities.ts';

/**
 * The `/departures` page.
 *
 * One tour at a time: the tour picker overlays the departure and pricing
 * managers. It defaults to the first tour so the section is never blank, and
 * `useTours('')` also anchors the picker options.
 */
export interface DeparturesPageController {
  tours: TourListRow[];
  toursPending: boolean;
  toursEmpty: boolean;
  selected: TourListRow | undefined;
  selectTour: (code: string | null) => void;
  /** Per-tour gates handed to the managers below. */
  departure: ReturnType<typeof useDepartureCapabilities>;
  pricing: ReturnType<typeof usePricingCapabilities>;
  trips: ReturnType<typeof useTripCapabilities>;
  goToTrips: () => void;
}

export function useDeparturesPage(): DeparturesPageController {
  const { code } = useAgencyContext();
  const navigate = useNavigate();
  const departure = useDepartureCapabilities();
  const pricing = usePricingCapabilities();
  const trips = useTripCapabilities();
  const toursQuery = useTours('');
  const tours = toursQuery.data ?? [];

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const selected = tours.find((tour) => tour.code === selectedCode) ?? tours[0] ?? undefined;

  return {
    tours,
    toursPending: toursQuery.isPending,
    toursEmpty: tours.length === 0,
    selected,
    selectTour: (next) => setSelectedCode(next),
    departure,
    pricing,
    trips,
    goToTrips: () => navigate(dashboardPaths.trips(code)),
  };
}
