import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { BookingStatus } from '../types.ts';
import {
  bookingRowActions,
  type BookingCapabilities,
  canViewTravelers,
  hasAnyBookingAction,
} from './booking-actions.ts';

const ALL: BookingCapabilities = {
  canView: true,
  canCreate: true,
  canCancel: true,
  canConfirm: true,
  traveler: { canView: true, canCreate: true, canUpdate: true },
};

const NONE: BookingCapabilities = {
  canView: false,
  canCreate: false,
  canCancel: false,
  canConfirm: false,
  traveler: { canView: false, canCreate: false, canUpdate: false },
};

const pending = { status: 'PENDING' as BookingStatus };
const confirmed = { status: 'CONFIRMED' as BookingStatus };
const cancelled = { status: 'CANCELLED' as BookingStatus };

describe('cancel gating', () => {
  it('offers cancel on a non-terminal booking with permission', () => {
    assert.equal(bookingRowActions(pending, ALL).canCancel, true);
  });

  it('never offers cancel on a terminal (cancelled) booking', () => {
    assert.equal(bookingRowActions(cancelled, ALL).canCancel, false);
  });
});

describe('confirm gating', () => {
  it('offers confirm on a PENDING booking with permission', () => {
    assert.equal(bookingRowActions(pending, ALL).canConfirm, true);
  });

  it('never offers confirm once the booking has left PENDING', () => {
    assert.equal(bookingRowActions(confirmed, ALL).canConfirm, false);
    assert.equal(bookingRowActions(cancelled, ALL).canConfirm, false);
  });

  it('hides confirm without the permission, whatever the status', () => {
    assert.equal(bookingRowActions(pending, NONE).canConfirm, false);
  });
});

describe('permission gating', () => {
  it('hides everything without permissions', () => {
    assert.equal(hasAnyBookingAction(bookingRowActions(pending, NONE)), false);
  });

  it('maps each permission to its own action independently', () => {
    const cancelOnly = bookingRowActions(pending, { ...NONE, canCancel: true });
    assert.equal(cancelOnly.canCancel, true);
    assert.equal(cancelOnly.canViewDetails, false);
    assert.equal(cancelOnly.canConfirm, false);

    const viewOnly = bookingRowActions(cancelled, { ...NONE, canView: true });
    assert.equal(viewOnly.canViewDetails, true);
    assert.equal(viewOnly.canCancel, false);
  });

  it('tracks the status independently of the permissions', () => {
    const pendingView = bookingRowActions(pending, { ...NONE, canView: true });
    assert.equal(pendingView.canCancel, false);
    const cancelledCancel = bookingRowActions(cancelled, { ...NONE, canCancel: true });
    assert.equal(cancelledCancel.canCancel, false);
  });
});

describe('hasAnyBookingAction', () => {
  it('is true when at least one action is offered', () => {
    assert.equal(hasAnyBookingAction(bookingRowActions(pending, ALL)), true);
    assert.equal(
      hasAnyBookingAction(bookingRowActions(cancelled, { ...NONE, canView: true })),
      true
    );
  });
});

describe('traveler visibility', () => {
  it('opens the traveler card only with the traveler view permission', () => {
    assert.equal(canViewTravelers(ALL), true);
    assert.equal(canViewTravelers(NONE), false);
  });
});
