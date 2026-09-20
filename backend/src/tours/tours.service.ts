import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateTourCode } from './tour-code.js';
import type {
  CreateTourBody,
  ListToursQuery,
  TourPayload,
  UpdateTourBody,
} from './tours.schemas.js';
import {
  TOUR_LIST_SELECT,
  TOUR_SELECT,
  toTourListResponse,
  toTourResponse,
  type TourListResponse,
  type TourResponse,
  type TourRow,
} from './tours.types.js';

type TourWithId = TourRow & { id: bigint };

/** Which Module F gate a publish is missing, in a stable, code-symbolic form. */
export type TourPublishBlocker =
  | 'NAME'
  | 'DESTINATION'
  | 'SHORT_DESCRIPTION'
  | 'COVER_IMAGE'
  | 'SCHEDULED_DEPARTURES_REQUIRED';

function conflict(errorCode: string, message: string, metadata?: Record<string, unknown>) {
  return new ConflictException({ statusCode: 409, message, errorCode, ...(metadata ? { metadata } : {}) });
}

/**
 * Agency tours (the reusable travel product), scoped to ONE agency.
 *
 * Every method takes the `agencyId` the guard already resolved from the route,
 * and every query is filtered by it — an operation issued through agency A's
 * route can only ever read or mutate agency A's tours. No method accepts an
 * agency identifier from a request body; the FK to `agency` cascades.
 *
 * Lifecycle model:
 * - Create always lands in DRAFT. The backend NEVER auto-publishes.
 * - `PUT` is a full aggregate replacement inside one transaction: destinations
 *   and itinerary are re-created from the payload (positions 0..n), so the
 *   stored tour always mirrors exactly what the client sent.
* - Publishing runs a server-side readiness gate. SCHEDULED tours are blocked
 *   until at least one OPEN departure exists (Module G); a full schedule with
 *   only CLOSED or CANCELLED departures does not count. Pricing is NOT a
 *   publisher requirement yet (Module H).
 * - Archived is one-way, like customers.
 */
@Injectable()
export class ToursService {
  constructor(private readonly prisma: PrismaService) {}

  async list(agencyId: bigint, query: ListToursQuery): Promise<TourListResponse[]> {
    const search = query.search?.trim();
    const contains = search ? { contains: search, mode: 'insensitive' as const } : undefined;

    const tours = await this.prisma.tour.findMany({
      where: {
        agencyId,
        // Archived trips are excluded unless the caller asks for them
        // explicitly; archived rows stay readable by code either way.
        ...(query.status ? { status: query.status } : { status: { not: 'ARCHIVED' as const } }),
        ...(contains
          ? {
              OR: [
                { code: contains },
                { name: contains },
                { internalRef: contains },
                {
                  destinations: {
                    some: { OR: [{ locality: contains }, { place: contains }] },
                  },
                },
              ],
            }
          : {}),
      },
      select: TOUR_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    // `startingPrice` is derived from OPEN departures, never stored: one
    // aggregate per tour (the list is already loaded, and a tour's pricing
    // lives behind a `prisma.departurePrice` relation the way `openDepartureCount`
    // does for publish). A tour without priced OPEN departures shows null.
    const startingPrices = await Promise.all(
      tours.map((tour) => this.startingPriceFor(tour.id)),
    );

    return tours.map((tour, index) => toTourListResponse(tour, startingPrices[index] ?? null));
  }

  async getByCode(agencyId: bigint, code: string): Promise<TourResponse> {
    const tour = await this.requireTour(agencyId, code);
    return toTourResponse(tour, await this.startingPriceFor(tour.id));
  }

  async create(agencyId: bigint, input: CreateTourBody): Promise<TourResponse> {
    const created = await this.prisma.tour.create({
      data: {
        ...this.scalarFields(input),
        agencyId,
        code: generateTourCode(),
        destinations: {
          create: input.destinations.map(tourDestinationRow),
        },
        itinerary: { create: input.itinerary.map(tourItineraryRow) },
      },
      select: TOUR_SELECT,
    });

    return toTourResponse(created, await this.startingPriceFor(created.id));
  }

  /**
   * Full replacement: scalar fields are overwritten, and both ordered child
   * collections are deleted and re-created in one transaction. Position
   * uniquess on `(tour_id, position)` keeps the stored order consistent with
   * the payload.
   */
  async update(
    agencyId: bigint,
    code: string,
    input: UpdateTourBody,
  ): Promise<TourResponse> {
    const tour = await this.requireTour(agencyId, code);

    const updated = await this.prisma.tour.update({
      where: { id: tour.id },
      data: {
        ...this.scalarFields(input),
        destinations: {
          deleteMany: {},
          create: input.destinations.map(tourDestinationRow),
        },
        itinerary: { deleteMany: {}, create: input.itinerary.map(tourItineraryRow) },
      },
      select: TOUR_SELECT,
    });

    return toTourResponse(updated, await this.startingPriceFor(updated.id));
  }

  /**
   * Explicit publish. Never automatic: the caller asked, and the readiness gate
   * decides. SCHEDULED tours cannot publish in Module F (real departures arrive
   * with Module G); ON_REQUEST and CUSTOM_QUOTE publish once every Tour-owned
   * required field is ready. Pricing is not required yet (Module H), and
   * published does not mean bookable.
   */
  async publish(agencyId: bigint, code: string): Promise<TourResponse> {
    const tour = await this.requireTour(agencyId, code);

    if (tour.status === 'ARCHIVED') {
      throw conflict(
        'TOUR_PUBLISH_STATE_BLOCKED',
        'An archived tour cannot be published again',
      );
    }
    if (tour.status === 'PUBLISHED') {
      // Idempotent: publishing an already-published tour is a no-op.
      return toTourResponse(tour, await this.startingPriceFor(tour.id));
    }

    // OPEN departures count toward a SCHEDULED tour's publish readiness.
    // CLOSED and CANCELLED departures never count (Module G decision).
    const openDepartures =
      tour.availabilityMode === 'scheduled'
        ? await this.prisma.departure.count({
            where: { tourId: tour.id, status: 'OPEN' },
          })
        : 0;
    const blockers = computeTourPublishBlockers(tour, openDepartures);
    if (blockers.length > 0) {
      throw conflict(
        'TOUR_PUBLISH_READINESS_BLOCKED',
        'This tour is not ready to publish. ' + describeBlockers(blockers),
        { blockers },
      );
    }

    const updated = await this.prisma.tour.update({
      where: { id: tour.id },
      data: { status: 'PUBLISHED' },
      select: TOUR_SELECT,
    });

    return toTourResponse(updated, await this.startingPriceFor(tour.id));
  }

  async unpublish(agencyId: bigint, code: string): Promise<TourResponse> {
    const tour = await this.requireTour(agencyId, code);

    if (tour.status === 'ARCHIVED') {
      throw conflict(
        'TOUR_PUBLISH_STATE_BLOCKED',
        'An archived tour cannot be unpublished',
      );
    }
    if (tour.status === 'DRAFT') {
      return toTourResponse(tour, await this.startingPriceFor(tour.id));
    }

    const updated = await this.prisma.tour.update({
      where: { id: tour.id },
      data: { status: 'DRAFT' },
      select: TOUR_SELECT,
    });

    return toTourResponse(updated, await this.startingPriceFor(tour.id));
  }

  async archive(agencyId: bigint, code: string): Promise<TourResponse> {
    const tour = await this.requireTour(agencyId, code);

    if (tour.status === 'ARCHIVED') {
      throw conflict('TOUR_ALREADY_ARCHIVED', 'This tour is already archived');
    }

    const updated = await this.prisma.tour.update({
      where: { id: tour.id },
      data: { status: 'ARCHIVED' },
      select: TOUR_SELECT,
    });

    return toTourResponse(updated, await this.startingPriceFor(tour.id));
  }

  // ------------------------------------------------------------------ helpers

  /**
   * The tour's `startingPrice`: the minimum stored price across its OPEN
   * departures, or null when no OPEN departure carries a price. CLOSED and
   * CANCELLED departures never count, like publish readiness.
   */
  private async startingPriceFor(tourId: bigint): Promise<number | null> {
    const result = await this.prisma.departurePrice.aggregate({
      where: { departure: { tourId, status: 'OPEN' as const } },
      _min: { amount: true },
    });
    return result._min.amount == null ? null : Number(result._min.amount);
  }

  /** Scalar aggregate fields shared by create and update. */
  private scalarFields(
    input: TourPayload,
  ): Omit<Prisma.TourUncheckedCreateWithoutDestinationsInput, 'code' | 'agencyId' | 'id' | 'status' | 'createdAt' | 'updatedAt'> {
    return {
      name: input.name,
      internalRef: input.internalRef ?? null,
      format: input.format,
      geographicScope: input.geographicScope,
      availabilityMode: input.availabilityMode,
      participationMode: input.participationMode ?? null,
      guidanceType: input.guidanceType ?? null,
      days: input.days ?? null,
      nights: input.nights ?? null,
      hours: input.hours ?? null,
      isFlexible: input.isFlexible,
      minTravelers: input.minTravelers,
      languages: input.languages,
      themes: input.themes,
      activities: input.activities,
      audiences: input.audiences,
      transportModes: input.transportModes,
      accommodationTypes: input.accommodationTypes,
      activityRequirements:
        input.activityRequirements != null
          ? (input.activityRequirements as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      shortDescription: input.shortDescription ?? null,
      description: input.description ?? null,
      highlights: input.highlights as unknown as Prisma.InputJsonValue,
      included: input.included as unknown as Prisma.InputJsonValue,
      notIncluded: input.notIncluded as unknown as Prisma.InputJsonValue,
      importantInformation: input.importantInformation ?? null,
      cancellationPolicy: input.cancellationPolicy ?? null,
      meetingPoint: input.meetingPoint ?? null,
      meetingInstructions: input.meetingInstructions ?? null,
      coverImageUrl: input.coverImageUrl ?? null,
      gallery: input.gallery as unknown as Prisma.InputJsonValue,
      origin: (input.origin ?? { wilayaCode: null, cityId: null, place: null }) as Prisma.InputJsonValue,
    };
  }

  /**
   * Always scoped by `agencyId`, so another agency's tour (or a stale `TUR-...`
   * code) is a 404 here and never leaks existence.
   */
  private async requireTour(agencyId: bigint, code: string): Promise<TourWithId> {
    const tour = await this.prisma.tour.findFirst({
      where: { agencyId, code },
      select: { ...TOUR_SELECT, id: true },
    });
    if (!tour) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That tour was not found in this agency',
        errorCode: 'TOUR_NOT_FOUND',
      });
    }
    return tour;
  }
}

/**
 * The publish gate for Module G: everything the Tour aggregate itself owns plus
 * the live departure check that unblocks SCHEDULED tours. Pricing (Module H)
 * is not checked here. `openDepartureCount` is the number of OPEN departures on
 * the tour — a SCHEDULED tour reports `SCHEDULED_DEPARTURES_REQUIRED` while
 * that count stays zero (CLOSED and CANCELLED departures never count).
 */
export function computeTourPublishBlockers(
  tour: {
    name: string;
    geographicScope: string;
    destinations: Array<{ wilayaCode: string | null; place: string | null }>;
    shortDescription: string | null;
    coverImageUrl: string | null;
    availabilityMode: string;
  },
  openDepartureCount = 0,
): TourPublishBlocker[] {
  const blockers: TourPublishBlocker[] = [];

  if (!tour.name.trim()) blockers.push('NAME');

  const hasResolvedDestination = tour.destinations.some((destination) =>
    tour.geographicScope === 'international'
      ? Boolean(destination.place?.trim())
      : Boolean(destination.wilayaCode?.trim()),
  );
  if (!hasResolvedDestination) blockers.push('DESTINATION');

  if (!tour.shortDescription?.trim()) blockers.push('SHORT_DESCRIPTION');
  if (!tour.coverImageUrl?.trim()) blockers.push('COVER_IMAGE');

  if (tour.availabilityMode === 'scheduled' && openDepartureCount === 0) {
    blockers.push('SCHEDULED_DEPARTURES_REQUIRED');
  }

  return blockers;
}

function describeBlockers(blockers: TourPublishBlocker[]): string {
  return blockers
    .map((blocker) => {
      switch (blocker) {
        case 'NAME':
          return 'Name is missing.';
        case 'DESTINATION':
          return 'Add at least one resolved destination.';
        case 'SHORT_DESCRIPTION':
          return 'The customer-facing summary is missing.';
        case 'COVER_IMAGE':
          return 'The cover image is missing.';
        case 'SCHEDULED_DEPARTURES_REQUIRED':
          return 'Scheduled tours need at least one OPEN departure to publish — departures arrive in a later update.';
      }
    })
    .join(' ');
}

function tourDestinationRow(
  destination: { wilayaCode?: string | null; cityId?: string | null; place?: string | null },
  position: number,
) {
  return {
    position,
    wilayaCode: destination.wilayaCode ?? null,
    locality: destination.cityId ?? null,
    place: destination.place ?? null,
  };
}

function tourItineraryRow(
  day: { title: string; location: string; description: string },
  position: number,
) {
  return {
    position,
    title: day.title,
    location: day.location,
    description: day.description,
  };
}