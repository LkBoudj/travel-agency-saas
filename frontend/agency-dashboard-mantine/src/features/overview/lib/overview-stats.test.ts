import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AgencyBooking, BookingStatus } from '../../bookings/types.ts';
import type { Customer } from '../../customers/types.ts';
import type { AgencyMember } from '../../members/types.ts';
import type { TourListRow } from '../../trips/types.ts';
import {
  BOOKING_STATUSES,
  countActiveCustomers,
  countActiveMembers,
  countPublishedTours,
  recentBookings,
  tallyBookings,
} from './overview-stats.ts';

const booking = (status: BookingStatus): AgencyBooking => ({
  code: 'BKG-1',
  status,
  customer: { code: 'CUS-1', firstName: 'A', lastName: 'B' },
  tour: { code: 'TUR-1', name: 'T' },
  departure: { code: 'DEP-1', startAt: '2026-10-15T10:00:00.000Z' },
  reservedSeats: 2,
  currency: 'DZD',
  totalAmount: 100,
  notes: null,
  confirmedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  createdAt: '2026-09-24T10:00:00.000Z',
  updatedAt: '2026-09-24T10:00:00.000Z',
});

describe('BOOKING_STATUSES', () => {
  it('exhausts the backend vocabulary', () => {
    assert.deepEqual(BOOKING_STATUSES, ['PENDING', 'CONFIRMED', 'CANCELLED']);
  });
});

describe('tallyBookings', () => {
  it('counts every status with zero-present keys', () => {
    const tally = tallyBookings([booking('CONFIRMED'), booking('PENDING'), booking('CONFIRMED')]);
    assert.deepEqual(tally, { PENDING: 1, CONFIRMED: 2, CANCELLED: 0 });
  });

  it('handles an empty list', () => {
    assert.deepEqual(tallyBookings([]), { PENDING: 0, CONFIRMED: 0, CANCELLED: 0 });
  });
});

describe('countActiveCustomers', () => {
  it('counts only ACTIVE customers', () => {
    const customers: Customer[] = [
      { status: 'ACTIVE' } as Customer,
      { status: 'ARCHIVED' } as Customer,
      { status: 'ACTIVE' } as Customer,
    ];
    assert.equal(countActiveCustomers(customers), 2);
  });
});

describe('countPublishedTours', () => {
  it('counts only PUBLISHED tours', () => {
    const tours: TourListRow[] = [
      { status: 'PUBLISHED' } as TourListRow,
      { status: 'DRAFT' } as TourListRow,
      { status: 'PUBLISHED' } as TourListRow,
    ];
    assert.equal(countPublishedTours(tours), 2);
  });
});

describe('countActiveMembers', () => {
  it('counts only ACTIVE memberships', () => {
    const members: AgencyMember[] = [
      { membershipStatus: 'ACTIVE' } as AgencyMember,
      { membershipStatus: 'SUSPENDED' } as AgencyMember,
    ];
    assert.equal(countActiveMembers(members), 1);
  });
});

describe('recentBookings', () => {
  it('bounds the slice newest-first', () => {
    const list = [booking('PENDING'), booking('CONFIRMED'), booking('CANCELLED')];
    assert.equal(recentBookings(list, 2).length, 2);
    assert.equal(recentBookings(list, 2)[0], list[0]);
  });

  it('cannot exceed the list length', () => {
    assert.equal(recentBookings([booking('PENDING')], 5).length, 1);
  });
});
