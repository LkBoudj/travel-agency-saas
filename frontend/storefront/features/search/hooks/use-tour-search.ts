import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useDateRange } from "./use-date-range";
import { useTravelers, type TravelersState } from "./use-travelers";

export interface TourSearchState extends TravelersState {
  destination: string;
  setDestination: (value: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
}

export function useTourSearch(): TourSearchState {
  const [destination, setDestination] = useState("");
  const { dateRange, setDateRange } = useDateRange();
  const travelers = useTravelers();
  return {
    destination,
    setDestination,
    dateRange,
    setDateRange,
    ...travelers,
  };
}