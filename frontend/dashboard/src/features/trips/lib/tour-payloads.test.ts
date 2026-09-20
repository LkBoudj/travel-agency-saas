import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  buildTourPayload,
  toTripFormValues,
  toTripRow,
  toTripStatus,
  toTourStatus,
} from "./tour-payloads.ts"

function fillForm(): Parameters<typeof buildTourPayload>[0] {
  return {
    status: "draft",
    name: "  Tikjda Hiking Day  ",
    internalRef: "  TIK-1D-001  ",
    format: "day_excursion",
    geographicScope: "domestic",
    availabilityMode: "scheduled",
    participationMode: "",
    guidanceType: "",
    origin: { wilayaCode: "16", cityId: "Alger Centre", place: "" },
    destinations: [{ wilayaCode: "15", cityId: "Tikjda", place: "Tikjda" }],
    days: 1,
    nights: 0,
    hours: undefined,
    isFlexible: false,
    languages: [" French ", "", "Arabic"],
    minTravelers: 2,
    themes: ["mountain"],
    activities: ["hiking"],
    audiences: ["friends"],
    activityRequirements: {
      difficulty: "moderate",
      distanceKm: 12,
      requiredEquipment: "  Hiking shoes  ",
    },
    transportModes: ["car"],
    accommodationTypes: ["none"],
    shortDescription: "  A day in the Djurdjura.  ",
    description: "  The full story.  ",
    highlights: [{ text: "  Bosphorus view  " }, { text: "   " }],
    itinerary: [
      { title: "  Day 1  ", location: "  Tikjda  ", description: "  Hike  " },
      { title: "  ", location: "  , ", description: "  partial  " },
    ],
    included: [{ text: "  Transport  " }],
    notIncluded: [{ text: "  Lunch  " }],
    importantInformation: "  Passport  ",
    cancellationPolicy: "",
    meetingPoint: "  Gate B  ",
    meetingInstructions: "  ",
    extras: [{ name: "VIP", description: "", price: 5000, basis: "per_booking" }],
    coverImageUrl: "  https://example.com/a.jpg  ",
    gallery: [{ url: "  https://example.com/g.jpg  " }, { url: "  " }],
  }
}

describe("buildTourPayload", () => {
  it("builds the strict aggregate, trimmed and nulled like the backend", () => {
    const payload = buildTourPayload(fillForm())
    assert.deepEqual(payload, {
      name: "Tikjda Hiking Day",
      internalRef: "TIK-1D-001",
      format: "day_excursion",
      geographicScope: "domestic",
      availabilityMode: "scheduled",
      participationMode: null,
      guidanceType: null,
      origin: { wilayaCode: "16", cityId: "Alger Centre", place: null },
      destinations: [{ wilayaCode: "15", cityId: "Tikjda", place: "Tikjda" }],
      days: 1,
      nights: 0,
      hours: null,
      isFlexible: false,
      languages: ["French", "Arabic"],
      minTravelers: 2,
      themes: ["mountain"],
      activities: ["hiking"],
      audiences: ["friends"],
      activityRequirements: {
        difficulty: "moderate",
        distanceKm: 12,
        requiredEquipment: "Hiking shoes",
      },
      transportModes: ["car"],
      accommodationTypes: ["none"],
      shortDescription: "A day in the Djurdjura.",
      description: "The full story.",
      highlights: [{ text: "Bosphorus view" }],
      itinerary: [{ title: "Day 1", location: "Tikjda", description: "Hike" }],
      included: [{ text: "Transport" }],
      notIncluded: [{ text: "Lunch" }],
      importantInformation: "Passport",
      cancellationPolicy: null,
      meetingPoint: "Gate B",
      meetingInstructions: null,
      coverImageUrl: "https://example.com/a.jpg",
      gallery: [{ url: "https://example.com/g.jpg" }],
    })
  })

  it("never leaks status, pricing options or extras", () => {
    const payload = buildTourPayload(fillForm())
    assert.deepEqual(
      Object.keys(payload),
      [
        "name",
        "internalRef",
        "format",
        "geographicScope",
        "availabilityMode",
        "participationMode",
        "guidanceType",
        "origin",
        "destinations",
        "days",
        "nights",
        "hours",
        "isFlexible",
        "languages",
        "minTravelers",
        "themes",
        "activities",
        "audiences",
        "activityRequirements",
        "transportModes",
        "accommodationTypes",
        "shortDescription",
        "description",
        "highlights",
        "itinerary",
        "included",
        "notIncluded",
        "importantInformation",
        "cancellationPolicy",
        "meetingPoint",
        "meetingInstructions",
        "coverImageUrl",
        "gallery",
      ]
    )
  })

  it("sends no activity requirements when none are filled in", () => {
    const form = fillForm()
    form.activityRequirements = {}
    assert.equal(buildTourPayload(form).activityRequirements, null)
    form.activityRequirements = undefined
    assert.equal(buildTourPayload(form).activityRequirements, null)
  })
})

describe("status mapping", () => {
  it("round-trips between UI and backend statuses", () => {
    for (const [trip, tour] of [
      ["draft", "DRAFT"],
      ["published", "PUBLISHED"],
      ["archived", "ARCHIVED"],
    ] as const) {
      assert.equal(toTourStatus(trip), tour)
      assert.equal(toTripStatus(tour), trip)
    }
  })
})

describe("toTripFormValues", () => {
  it("inflates a stored tour into editable form values", () => {
    const tour = {
      code: "TUR-ABC123",
      name: "Tikjda Hike",
      internalRef: "TIK-1D-001",
      status: "PUBLISHED" as const,
      format: "day_excursion",
      geographicScope: "domestic",
      availabilityMode: "on_request",
      participationMode: "private",
      guidanceType: null,
      days: 1,
      nights: 0,
      hours: 8,
      isFlexible: false,
      minTravelers: 1,
      languages: ["Arabic"],
      themes: ["mountain"],
      activities: ["hiking"],
      audiences: ["friends"],
      activityRequirements: { difficulty: "easy" },
      transportModes: ["car"],
      accommodationTypes: ["none"],
      shortDescription: "A day.",
      description: "Full story.",
      highlights: [{ text: "View" }],
      itinerary: [{ title: "Day 1", location: "Tikjda", description: "Hike" }],
      included: [{ text: "Transport" }],
      notIncluded: [{ text: "Lunch" }],
      importantInformation: null,
      cancellationPolicy: "Free.",
      meetingPoint: null,
      meetingInstructions: "Gate B",
      coverImageUrl: null,
      gallery: [{ url: "https://x/y.jpg" }],
      origin: { wilayaCode: "16", cityId: "Alger Centre", place: null },
      destinations: [{ wilayaCode: "15", cityId: "Tikjda", place: "Tikjda" }],
      startingPrice: null,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    }

    const values = toTripFormValues(tour)
    assert.equal(values.status, "published")
    assert.equal(values.participationMode, "private")
    assert.equal(values.guidanceType, "")
    assert.deepEqual(values.origin, {
      wilayaCode: "16",
      cityId: "Alger Centre",
      place: "",
    })
    assert.deepEqual(values.destinations, [
      { wilayaCode: "15", cityId: "Tikjda", place: "Tikjda" },
    ])
    assert.deepEqual(values.activityRequirements, { difficulty: "easy" })
    assert.equal(values.coverImageUrl, "")
    assert.deepEqual(values.extras, [])
  })
})

describe("toTripRow", () => {
  it("maps a list row into the table read model with a display destination", () => {
    const row = toTripRow({
      code: "TUR-ABC123",
      name: "Tikjda Hike",
      internalRef: "TIK-1D-001",
      status: "PUBLISHED",
      coverImageUrl: "https://x/a.jpg",
      format: "day_excursion",
      geographicScope: "domestic",
      availabilityMode: "scheduled",
      days: 1,
      nights: 0,
      hours: null,
      destinations: [{ wilayaCode: "15", cityId: "Tikjda", place: "Tikjda" }],
      startingPrice: 25000,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    })

    assert.equal(row.id, "TUR-ABC123")
    assert.equal(row.status, "published")
    assert.deepEqual(row.destinations, [{ name: "Tikjda" }])
    assert.equal(row.days, 1)
    assert.equal(row.nextDeparture, null)
    assert.equal(row.startingPrice, 25000)
  })

  it("drops destinations with no resolvable name", () => {
    const row = toTripRow({
      code: "TUR-EMPTY",
      name: "Empty dest",
      internalRef: null,
      status: "DRAFT",
      coverImageUrl: null,
      format: "experience",
      geographicScope: "domestic",
      availabilityMode: "on_request",
      days: null,
      nights: null,
      hours: 3,
      destinations: [{ wilayaCode: null, cityId: null, place: "" }],
      startingPrice: null,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    })

    assert.deepEqual(row.destinations, [])
    assert.equal(row.startingPrice, null)
  })
})