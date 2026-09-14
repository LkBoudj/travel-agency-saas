import type { Trip } from "../types/trip.types"

/**
 * Presentation shell data for the trips list — NOT production data.
 * Three representative products (one per format family) used to build and
 * verify the list UI before the API exists.
 *
 * TODO(api): remove this file once real trip queries are wired.
 */
export const PLACEHOLDER_TRIPS: Trip[] = [
  {
    id: "demo-tikjda-hiking-day",
    name: "Tikjda Hiking Day",
    internalRef: "TIK-1D-001",
    status: "published",
    coverImageUrl: "",
    destinations: [{ name: "Tikjda" }],
    format: "day_excursion",
    geographicScope: "domestic",
    availabilityMode: "scheduled",
    days: 1,
    nights: 0,
    nextDeparture: "2026-10-10",
    startingPrice: 4500,
  },
  {
    id: "demo-tadrart-desert-circuit",
    name: "Tadrart Desert Circuit",
    internalRef: "TAD-7D-002",
    status: "draft",
    coverImageUrl: "",
    destinations: [{ name: "Illizi" }, { name: "Tassili n'Ajjer" }],
    format: "circuit",
    geographicScope: "domestic",
    availabilityMode: "scheduled",
    days: 7,
    nights: 6,
    nextDeparture: null,
    startingPrice: null,
  },
  {
    id: "demo-antalya-summer-stay",
    name: "Antalya Summer Stay",
    internalRef: "ANT-8D-003",
    status: "published",
    coverImageUrl: "",
    destinations: [{ name: "Antalya" }],
    format: "stay",
    geographicScope: "international",
    availabilityMode: "scheduled",
    days: 8,
    nights: 7,
    nextDeparture: "2026-07-01",
    startingPrice: 185000,
  },
]