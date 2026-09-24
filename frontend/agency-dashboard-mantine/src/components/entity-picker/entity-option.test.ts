import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { filterEntityOptions, type EntityOption } from './entity-option.ts';

const OPTIONS: EntityOption[] = [
  { code: 'CUS-1', label: 'Amine Benali', sublabel: 'i@example.com' },
  { code: 'CUS-2', label: 'Sofia Hamdi', sublabel: 'so@example.com' },
  { code: 'DEP-9', label: 'Departure 9', sublabel: 'Sat 01 May 2026' },
];

describe('filterEntityOptions', () => {
  test('returns every option for a blank query', () => {
    assert.deepEqual(filterEntityOptions(OPTIONS, '  '), OPTIONS);
  });

  test('matches case-insensitively on the label', () => {
    assert.deepEqual(
      filterEntityOptions(OPTIONS, 'amine').map((o) => o.code),
      ['CUS-1']
    );
  });

  test('matches on the code', () => {
    assert.deepEqual(
      filterEntityOptions(OPTIONS, 'dep-9').map((o) => o.code),
      ['DEP-9']
    );
  });

  test('matches on the sublabel', () => {
    assert.deepEqual(
      filterEntityOptions(OPTIONS, 'May').map((o) => o.code),
      ['DEP-9']
    );
  });

  test('returns nothing when nothing matches', () => {
    assert.deepEqual(filterEntityOptions(OPTIONS, 'zzz'), []);
  });
});
