import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTravelerWritePayload, travelerManifestComplete } from './traveler-payloads.ts';

describe('buildTravelerWritePayload', () => {
  it('trims names and always ships them', () => {
    const payload = buildTravelerWritePayload({
      firstName: '  Amel  ',
      lastName: ' Benali ',
      email: '',
      phone: '  ',
      notes: '\n',
    });
    assert.deepEqual(payload, {
      firstName: 'Amel',
      lastName: 'Benali',
      email: null,
      phone: null,
      notes: null,
    });
  });

  it('keeps the optional values when they carry real content', () => {
    const payload = buildTravelerWritePayload({
      firstName: 'Amel',
      lastName: 'Benali',
      email: 'amel@example.com',
      phone: '0550 12 34 56',
      notes: 'Needs a window seat.',
    });
    assert.deepEqual(payload, {
      firstName: 'Amel',
      lastName: 'Benali',
      email: 'amel@example.com',
      phone: '0550 12 34 56',
      notes: 'Needs a window seat.',
    });
  });

  it('clears a blank optional back to null (never an empty stub)', () => {
    const cleared = buildTravelerWritePayload({
      firstName: 'Amel',
      lastName: 'Benali',
      email: '',
      phone: '',
      notes: '',
    });
    assert.equal(cleared.email, null);
    assert.equal(cleared.phone, null);
    assert.equal(cleared.notes, null);
  });
});

describe('travelerManifestComplete', () => {
  it('is only true when every reserved seat has a traveler', () => {
    assert.equal(travelerManifestComplete(0, 0), true);
    assert.equal(travelerManifestComplete(2, 2), true);
    assert.equal(travelerManifestComplete(1, 2), false);
    assert.equal(travelerManifestComplete(3, 2), false);
  });
});
