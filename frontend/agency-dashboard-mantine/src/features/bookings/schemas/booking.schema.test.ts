import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createBookingFormSchema, travelerFormSchema } from './booking.schema.ts';

const validBooking = {
  customerCode: 'CUS-1',
  tourCode: 'TOU-1',
  departureCode: 'DEP-1',
  reservedSeats: '3',
  pricingSelections: [],
  notes: '',
};

describe('createBookingFormSchema', () => {
  it('accepts a fully filled booking form', () => {
    assert.equal(createBookingFormSchema.safeParse(validBooking).success, true);
  });

  it('rejects blank required codes', () => {
    for (const field of ['customerCode', 'tourCode', 'departureCode'] as const) {
      const result = createBookingFormSchema.safeParse({ ...validBooking, [field]: '   ' });
      assert.equal(result.success, false, field);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === field);
        assert.ok(issue, `expected an issue on ${field}`);
        assert.equal(issue.code, 'too_small');
      }
    }
  });

  it('rejects a blank, zero, negative or fractional seat count', () => {
    assert.equal(
      createBookingFormSchema.safeParse({ ...validBooking, reservedSeats: '' }).success,
      false
    );
    assert.equal(
      createBookingFormSchema.safeParse({ ...validBooking, reservedSeats: '0' }).success,
      false
    );
    assert.equal(
      createBookingFormSchema.safeParse({ ...validBooking, reservedSeats: '-1' }).success,
      false
    );
    assert.equal(
      createBookingFormSchema.safeParse({ ...validBooking, reservedSeats: '2.5' }).success,
      false
    );
  });

  it('rejects more than 50 pricing selections', () => {
    const pricingSelections = Array.from({ length: 51 }, (_, i) => `PRC-${i}`);
    assert.equal(
      createBookingFormSchema.safeParse({ ...validBooking, pricingSelections }).success,
      false
    );
  });

  it('rejects duplicate pricing selections', () => {
    const result = createBookingFormSchema.safeParse({
      ...validBooking,
      pricingSelections: ['PRC-1', 'PRC-1'],
    });
    assert.equal(result.success, false);
    if (!result.success) {
      assert.ok(
        result.error.issues.some((i) => i.path[0] === 'pricingSelections'),
        'expected an issue on pricingSelections'
      );
    }
  });

  it('accepts a full set of distinct pricing selections', () => {
    assert.equal(
      createBookingFormSchema.safeParse({
        ...validBooking,
        pricingSelections: ['PRC-1', 'PRC-2', 'PRC-3'],
      }).success,
      true
    );
  });

  it('rejects notes longer than 2000 chars', () => {
    assert.equal(
      createBookingFormSchema.safeParse({ ...validBooking, notes: 'x'.repeat(2001) }).success,
      false
    );
  });

  it('rejects unknown keys', () => {
    assert.equal(
      createBookingFormSchema.safeParse({ ...validBooking, unexpected: true }).success,
      false
    );
  });
});

const validTraveler = {
  firstName: 'Amel',
  lastName: 'Benali',
  email: '',
  phone: '',
  notes: '',
};

describe('travelerFormSchema', () => {
  it('accepts a fully filled traveler form', () => {
    assert.equal(
      travelerFormSchema.safeParse({
        ...validTraveler,
        email: 'amel@example.com',
        phone: '0550 12 34 56',
        notes: 'Window seat.',
      }).success,
      true
    );
  });

  it('rejects blank names', () => {
    assert.equal(
      travelerFormSchema.safeParse({ ...validTraveler, firstName: '  ' }).success,
      false
    );
    assert.equal(travelerFormSchema.safeParse({ ...validTraveler, lastName: '  ' }).success, false);
  });

  it('rejects names longer than 100 chars', () => {
    assert.equal(
      travelerFormSchema.safeParse({ ...validTraveler, firstName: 'x'.repeat(101) }).success,
      false
    );
  });

  it('accepts a blank optional email and rejects a malformed one', () => {
    assert.equal(travelerFormSchema.safeParse(validTraveler).success, true);
    assert.equal(
      travelerFormSchema.safeParse({ ...validTraveler, email: 'not-an-email' }).success,
      false
    );
  });

  it('rejects a phone longer than 32 chars', () => {
    assert.equal(
      travelerFormSchema.safeParse({ ...validTraveler, phone: 'x'.repeat(33) }).success,
      false
    );
  });
});
