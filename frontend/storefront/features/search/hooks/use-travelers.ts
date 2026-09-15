import { useState } from "react";

export interface TravelersState {
  adults: number;
  children: number;
  totalTravelers: number;
  travelerLabel: string;
  setAdults: (value: number) => void;
  setChildren: (value: number) => void;
}

export function useTravelers(
  initialAdults = 2,
  initialChildren = 0,
): TravelersState {
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const totalTravelers = adults + children;
  const travelerLabel =
    totalTravelers === 1 ? "1 Traveler" : `${totalTravelers} Travelers`;
  return {
    adults,
    children,
    totalTravelers,
    travelerLabel,
    setAdults,
    setChildren,
  };
}