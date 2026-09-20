import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { generatePricingOptionCode } from './pricing-code.js';
import type {
  CreatePricingOptionBody,
  ReplaceDeparturePricesBody,
  UpdatePricingOptionBody,
} from './pricing.schemas.js';
import {
  PRICING_OPTION_REFERENCE_SELECT,
  PRICING_OPTION_SELECT,
  toPricingOptionResponse,
  type DeparturePriceSetResponse,
  type PricingBasis,
  type PricingOptionResponse,
  type PricingOptionsOverviewResponse,
  type PricingOptionRow,
} from './pricing.types.js';

const TOUR_SCOPE_SELECT = {
  id: true,
  code: true,
  status: true,
} as const satisfies Prisma.TourSelect;

type TourScope = Prisma.TourGetPayload<{ select: typeof TOUR_SCOPE_SELECT }>;

const DEPARTURE_REFERENCE_SELECT = {
  id: true,
  code: true,
  status: true,
} as const satisfies Prisma.DepartureSelect;

type DepartureReference = Prisma.DepartureGetPayload<{
  select: typeof DEPARTURE_REFERENCE_SELECT;
}>;

const DEFAULT_CURRENCY = 'DZD';

function conflict(errorCode: string, message: string) {
  return new ConflictException({ statusCode: 409, message, errorCode });
}

/**
 * Agency tour pricing, scoped to ONE route agency.
 *
 * Every method resolves the owning tour through the `agencyId` the guard
 * already resolved from the route, so operations issued through agency A's
 * route can only ever touch pricing of agency A's tours. A foreign or stale
 * `TUR-...`/`PRC-...`/`DEP-...` code is a 404 and never leaks existence. No
 * method accepts a tour, agency or status reference from a request body.
 *
 * Lifecycle model (Module H):
 * - PricingOptions are tour-owned definitions. Create always lands ACTIVE;
 *   `PUT` replaces the editable definition while ACTIVE; deactivate is the
 *   one-way route to INACTIVE (prices already stored on departures stay, but
 *   the option stops being offerable on new price sets). There is no hard
 *   delete, like every other aggregation in the platform.
 * - The actual money lives in `DeparturePrice`, one row per (departure, option)
 *   pair, managed as a whole set per departure: a `PUT` replaces the set in
 *   one transaction.
 * - A tour keeps a single currency (default `DZD`): set at option creation and
 *   immutable afterwards, enforced across the tour by the service.
 * - `startingPrice` is derived, never stored: the minimum amount among the
 *   tour's OPEN departures (or null when none), served from the pricing
 *   overview and from the tours list/detail.
 * - CANCELLED departures never accept price changes (DEPARTURE_ALREADY_CANCELLED).
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------- pricing options

  /**
   * The pricing overview of one tour: its options plus the derived
   * `startingPrice` and `pricedOpenDepartureCount` the dashboard renders in
   * one request.
   */
  async listOptionsOverview(
    agencyId: bigint,
    tourCode: string,
  ): Promise<PricingOptionsOverviewResponse> {
    const tour = await this.requireTour(agencyId, tourCode);

    const [options, departureCounts, pricedOpenDepartures, starting] = await Promise.all([
      this.prisma.pricingOption.findMany({
        where: { tourId: tour.id },
        select: PRICING_OPTION_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.departurePrice.groupBy({
        by: ['pricingOptionId'],
        where: { departure: { tourId: tour.id } },
        _count: { _all: true },
      }),
      this.prisma.departurePrice.groupBy({
        by: ['departureId'],
        where: { departure: { tourId: tour.id, status: 'OPEN' } },
      }),
      this.prisma.departurePrice.aggregate({
        where: { departure: { tourId: tour.id, status: 'OPEN' } },
        _min: { amount: true },
      }),
    ]);

    const counts = new Map(
      departureCounts.map((row) => [row.pricingOptionId, row._count._all]),
    );

    return {
      options: options.map((option) =>
        toPricingOptionResponse(option, counts.get(option.id) ?? 0),
      ),
      startingPrice: starting._min.amount == null ? null : Number(starting._min.amount),
      pricedOpenDepartureCount: pricedOpenDepartures.length,
    };
  }

  async getPricingOption(
    agencyId: bigint,
    tourCode: string,
    optionCode: string,
  ): Promise<PricingOptionResponse> {
    const tour = await this.requireTour(agencyId, tourCode);
    const option = await this.requireOptionByTour(tour.id, optionCode);
    return this.readOption(option);
  }

  async createPricingOption(
    agencyId: bigint,
    tourCode: string,
    input: CreatePricingOptionBody,
  ): Promise<PricingOptionResponse> {
    const tour = await this.requireTour(agencyId, tourCode);
    const currency = input.currency ?? DEFAULT_CURRENCY;

    // Single currency per tour: a new option must share the tour's currency.
    const existingCurrency = await this.prisma.pricingOption.findFirst({
      where: { tourId: tour.id },
      select: { currency: true },
    });
    if (existingCurrency && existingCurrency.currency !== currency) {
      throw conflict(
        'PRICING_CURRENCY_MISMATCH',
        `This tour is priced in ${existingCurrency.currency}; ${currency} prices cannot be mixed in`,
      );
    }

    await this.throwIfNameTaken(tour.id, input.name);

    try {
      const created = await this.prisma.pricingOption.create({
        data: {
          tourId: tour.id,
          code: generatePricingOptionCode(),
          // Status is never accepted from the body: a new option starts ACTIVE.
          status: 'ACTIVE',
          name: input.name,
          description: input.description ?? null,
          basis: input.basis,
          currency,
        },
        select: PRICING_OPTION_SELECT,
      });
      return toPricingOptionResponse(created, 0);
    } catch (error) {
      this.throwNameConflictIfUnique(error);
      throw error;
    }
  }

  async updatePricingOption(
    agencyId: bigint,
    tourCode: string,
    optionCode: string,
    input: UpdatePricingOptionBody,
  ): Promise<PricingOptionResponse> {
    const tour = await this.requireTour(agencyId, tourCode);
    const option = await this.requireOptionByTour(tour.id, optionCode);

    if (option.status === 'INACTIVE') {
      throw conflict(
        'PRICING_OPTION_INACTIVE',
        'A deactivated option cannot be edited',
      );
    }
    if (input.name !== option.name) {
      await this.throwIfNameTaken(tour.id, input.name);
    }

    try {
      const updated = await this.prisma.pricingOption.update({
        where: { id: option.id },
        data: {
          name: input.name,
          description: input.description ?? null,
          basis: input.basis,
        },
        select: PRICING_OPTION_SELECT,
      });
      return await this.readOption(updated);
    } catch (error) {
      this.throwNameConflictIfUnique(error);
      throw error;
    }
  }

  /**
   * One-way deactivation, like archiving a tour: stored prices on departures
   * stay (history/past bookings are never rewritten), but the option is no
   * longer available on new price sets.
   */
  async deactivatePricingOption(
    agencyId: bigint,
    tourCode: string,
    optionCode: string,
  ): Promise<PricingOptionResponse> {
    const tour = await this.requireTour(agencyId, tourCode);
    const option = await this.requireOptionByTour(tour.id, optionCode);

    if (option.status === 'INACTIVE') {
      throw conflict(
        'PRICING_OPTION_ALREADY_INACTIVE',
        'This option is already deactivated',
      );
    }

    const updated = await this.prisma.pricingOption.update({
      where: { id: option.id },
      data: { status: 'INACTIVE' },
      select: PRICING_OPTION_SELECT,
    });

    return await this.readOption(updated);
  }

  // ----------------------------------------------------------- departure prices

  async getDeparturePrices(
    agencyId: bigint,
    tourCode: string,
    departureCode: string,
  ): Promise<DeparturePriceSetResponse> {
    const tour = await this.requireTour(agencyId, tourCode);
    const departure = await this.requireDepartureByTour(tour.id, departureCode);
    return this.readPriceSet(departure);
  }

  /**
   * Replaces the whole price set of one departure in one transaction. Every
   * `pricingOptionCode` must already belong to the same tour (a foreign or
   * deactivated option is a 404 / 409, never silently dropped), CANCELLED
   * departures are locked, and the result is a set in one source currency.
   */
  async replaceDeparturePrices(
    agencyId: bigint,
    tourCode: string,
    departureCode: string,
    input: ReplaceDeparturePricesBody,
  ): Promise<DeparturePriceSetResponse> {
    const tour = await this.requireTour(agencyId, tourCode);
    const departure = await this.requireDepartureByTour(tour.id, departureCode);

    if (departure.status === 'CANCELLED') {
      throw conflict(
        'DEPARTURE_ALREADY_CANCELLED',
        'A cancelled departure cannot be edited',
      );
    }

    const optionCodes = [...new Set(input.prices.map((price) => price.pricingOptionCode))];
    const found =
      optionCodes.length > 0
        ? await this.prisma.pricingOption.findMany({
            where: { tourId: tour.id, code: { in: optionCodes } },
            select: PRICING_OPTION_REFERENCE_SELECT,
          })
        : [];
    if (found.length !== optionCodes.length) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'One or more pricing options were not found on this tour',
        errorCode: 'PRICING_OPTION_NOT_FOUND',
      });
    }

    const byCode = new Map(found.map((option) => [option.code, option]));
    const currencies = new Set(found.map((option) => option.currency));
    if (currencies.size > 1) {
      throw conflict(
        'PRICING_CURRENCY_MISMATCH',
        'A departure can only be priced in one currency',
      );
    }
    for (const option of found) {
      if (option.status !== 'ACTIVE') {
        throw conflict(
          'PRICING_OPTION_INACTIVE',
          `The option "${option.name}" is deactivated and cannot be priced`,
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.departurePrice.deleteMany({
        where: { departureId: departure.id },
      }),
      this.prisma.departurePrice.createMany({
        data: input.prices.map((price) => ({
          departureId: departure.id,
          pricingOptionId: byCode.get(price.pricingOptionCode)!.id,
          amount: new Prisma.Decimal(price.amount),
        })),
      }),
    ]);

    return this.readPriceSet(departure);
  }

  // ------------------------------------------------------------------ helpers

  /** An option response with its live `pricedDepartureCount`. */
  private async readOption(option: PricingOptionRow): Promise<PricingOptionResponse> {
    const pricedDepartureCount = await this.prisma.departurePrice.count({
      where: { pricingOptionId: option.id },
    });
    return toPricingOptionResponse(option, pricedDepartureCount);
  }

  private async readPriceSet(
    departure: DepartureReference,
  ): Promise<DeparturePriceSetResponse> {
    const rows = await this.prisma.departurePrice.findMany({
      where: { departureId: departure.id },
      select: {
        amount: true,
        pricingOption: {
          select: {
            code: true,
            name: true,
            basis: true,
            currency: true,
            status: true,
          },
        },
      },
    });

    if (rows.length === 0) {
      return { departureCode: departure.code, currency: null, prices: [] };
    }

    const currencies = new Set(rows.map((row) => row.pricingOption.currency));
    const currency = currencies.size === 1 ? [...currencies][0]! : null;

    return {
      departureCode: departure.code,
      currency,
      prices: rows.map((row) => ({
        pricingOptionCode: row.pricingOption.code,
        pricingOptionName: row.pricingOption.name,
        basis: row.pricingOption.basis as PricingBasis,
        currency: row.pricingOption.currency,
        amount: Number(row.amount),
        active: row.pricingOption.status === 'ACTIVE',
      })),
    };
  }

  private async throwIfNameTaken(tourId: bigint, name: string): Promise<void> {
    const existing = await this.prisma.pricingOption.findFirst({
      where: { tourId, name },
      select: { id: true },
    });
    if (existing) {
      throw conflict(
        'PRICING_OPTION_NAME_TAKEN',
        'An option with this name already exists on this tour',
      );
    }
  }

  /** The name unique constraint (citext per tour) can win a race with a create. */
  private throwNameConflictIfUnique(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict(
        'PRICING_OPTION_NAME_TAKEN',
        'An option with this name already exists on this tour',
      );
    }
  }

  /** A foreign or stale `TUR-...` code is a 404 in this agency, never a leak. */
  private async requireTour(agencyId: bigint, tourCode: string): Promise<TourScope> {
    const tour = await this.prisma.tour.findFirst({
      where: { agencyId, code: tourCode },
      select: TOUR_SCOPE_SELECT,
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

  private async requireOptionByTour(
    tourId: bigint,
    optionCode: string,
  ): Promise<PricingOptionRow> {
    const option = await this.prisma.pricingOption.findFirst({
      where: { tourId, code: optionCode },
      select: PRICING_OPTION_SELECT,
    });
    if (!option) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That pricing option was not found on this tour',
        errorCode: 'PRICING_OPTION_NOT_FOUND',
      });
    }
    return option;
  }

  private async requireDepartureByTour(
    tourId: bigint,
    departureCode: string,
  ): Promise<DepartureReference> {
    const departure = await this.prisma.departure.findFirst({
      where: { tourId, code: departureCode },
      select: DEPARTURE_REFERENCE_SELECT,
    });
    if (!departure) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That departure was not found on this tour',
        errorCode: 'DEPARTURE_NOT_FOUND',
      });
    }
    return departure;
  }
}