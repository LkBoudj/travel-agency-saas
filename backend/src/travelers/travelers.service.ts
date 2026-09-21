import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateTravelerCode } from './traveler-code.js';
import type {
  AddTravelerBody,
  UpdateTravelerBody,
} from './travelers.schemas.js';
import {
  toTravelerResponse,
  TRAVELER_BOOKING_SELECT,
  TRAVELER_SELECT,
  type TravelerBookingRow,
  type TravelerResponse,
} from './travelers.types.js';

function conflict(errorCode: string, message: string, metadata?: Record<string, unknown>) {
  return new ConflictException({ statusCode: 409, message, errorCode, ...metadata });
}

function toBigInt(value: unknown): bigint {
  return typeof value === 'bigint' ? value : BigInt(String(value));
}

/** The booking row re-read under `FOR UPDATE` inside a traveler transaction. */
interface LockedBooking {
  id: bigint;
  status: string;
  reservedSeats: number;
}

interface BookingLockRow {
  id: unknown;
  status: string;
  reserved_seats: unknown;
}

/**
 * Traveler records of one booking, scoped to ONE route agency.
 *
 * Every method resolves the booking through `:agencyCode` + `:bookingCode`, so
 * operations issued through agency A's route can only ever touch agency A's
 * bookings: a foreign or stale `BKG-...` code is a 404 and never leaks
 * existence, and a traveler is always read/written through its booking's id.
 * No method accepts an agency, booking or traveler `code` from a request body.
 *
 * PENDING-only write rule: travelers are the seat manifest a PENDING booking
 * must assemble before it can be confirmed (count == `reservedSeats`), so rows
 * are added/corrected only while the booking is PENDING. Once the booking
 * leaves PENDING the manifest is frozen — the service rejects further writes
 * with `BOOKING_TRAVELERS_FROZEN` and the module migration's trigger set makes
 * that rule unconditional at the database. There is deliberately no delete:
 * `reservedSeats` is immutable, so a shrink (delete) would leave the manifest
 * permanently unable to match it.
 */
@Injectable()
export class TravelersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(agencyId: bigint, bookingCode: string): Promise<TravelerResponse[]> {
    const booking = await this.requireBooking(agencyId, bookingCode);
    const travelers = await this.prisma.bookingTraveler.findMany({
      where: { bookingId: booking.id },
      select: TRAVELER_SELECT,
      orderBy: { createdAt: 'asc' },
    });
    return travelers.map(toTravelerResponse);
  }

  async add(
    agencyId: bigint,
    bookingCode: string,
    input: AddTravelerBody,
  ): Promise<TravelerResponse> {
    const booking = await this.requireBooking(agencyId, bookingCode);

    const created = await this.prisma.$transaction(async (tx) => {
      const locked = await this.lockBooking(tx, booking.id);
      if (locked.status !== 'PENDING') {
        throw conflict(
          'BOOKING_TRAVELERS_FROZEN',
          'Travelers can only be added while the booking is still pending',
        );
      }
      const count = await tx.bookingTraveler.count({
        where: { bookingId: locked.id },
      });
      if (count >= locked.reservedSeats) {
        throw conflict(
          'BOOKING_TRAVELER_LIMIT_REACHED',
          `This booking reserves ${locked.reservedSeats} seat(s) and already has ${count} ` +
            `traveler record(s); the manifest cannot exceed the reserved seats`,
          { expected: locked.reservedSeats, actual: count },
        );
      }
      return tx.bookingTraveler.create({
        data: {
          code: generateTravelerCode(),
          bookingId: locked.id,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email ?? null,
          phone: input.phone ?? null,
          notes: input.notes ?? null,
        },
        select: TRAVELER_SELECT,
      });
    });

    return toTravelerResponse(created);
  }

  async update(
    agencyId: bigint,
    bookingCode: string,
    travelerCode: string,
    input: UpdateTravelerBody,
  ): Promise<TravelerResponse> {
    const booking = await this.requireBooking(agencyId, bookingCode);

    const updated = await this.prisma.$transaction(async (tx) => {
      const locked = await this.lockBooking(tx, booking.id);
      if (locked.status !== 'PENDING') {
        throw conflict(
          'BOOKING_TRAVELERS_FROZEN',
          'Travelers can only be updated while the booking is still pending',
        );
      }
      const existing = await tx.bookingTraveler.findFirst({
        where: { code: travelerCode, bookingId: locked.id },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundException({
          statusCode: 404,
          message: 'That traveler was not found on this booking',
          errorCode: 'TRAVELER_NOT_FOUND',
        });
      }
      return tx.bookingTraveler.update({
        where: { id: existing.id },
        data: {
          ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
          ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
          ...(input.email !== undefined ? { email: input.email ?? null } : {}),
          ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
          ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
        },
        select: TRAVELER_SELECT,
      });
    });

    return toTravelerResponse(updated);
  }

  private async requireBooking(
    agencyId: bigint,
    code: string,
  ): Promise<TravelerBookingRow> {
    const booking = await this.prisma.booking.findFirst({
      where: { agencyId, code },
      select: TRAVELER_BOOKING_SELECT,
    });
    if (!booking) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That booking was not found in this agency',
        errorCode: 'BOOKING_NOT_FOUND',
      });
    }
    return booking;
  }

  /**
   * `SELECT ... FOR UPDATE` on the booking row inside the caller's transaction.
   *
   * This is the serialization point for the traveler manifest: two concurrent
   * writes on the same booking queue on this lock, and each one re-reads the
   * freshly committed traveler count (and booking status) under its own lock.
   */
  private async lockBooking(
    tx: Prisma.TransactionClient,
    bookingId: bigint,
  ): Promise<LockedBooking> {
    const rows = await tx.$queryRaw<BookingLockRow[]>`
      SELECT id, status, reserved_seats
      FROM booking
      WHERE id = ${bookingId}
      FOR UPDATE
    `;
    const row = rows[0];
    if (!row) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'That booking was not found in this agency',
        errorCode: 'BOOKING_NOT_FOUND',
      });
    }
    return {
      id: toBigInt(row.id),
      status: row.status,
      reservedSeats: Number(row.reserved_seats),
    };
  }
}