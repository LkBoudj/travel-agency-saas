import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import type { EntityOption } from './entity-option.ts';
import {
  isQuickCreateValue,
  keywordFromQuickCreateValue,
  quickCreateKeyword,
  quickCreateOptionValue,
  shouldOfferQuickCreate,
  splitKeywordIntoPersonName,
} from './quick-create-flow.ts';

const OPTIONS: EntityOption[] = [
  { code: 'CUS-1', label: 'Amine' },
  { code: 'CUS-2', label: 'Sofia' },
];

describe('quickCreateKeyword', () => {
  test('is the trimmed query', () => {
    assert.equal(quickCreateKeyword('  Amine  '), 'Amine');
  });
});

describe('shouldOfferQuickCreate', () => {
  test('offers creation on a non-blank unmatched query', () => {
    assert.equal(shouldOfferQuickCreate(OPTIONS, 'Nadia', true), true);
  });

  test('never offers creation when the user cannot create', () => {
    assert.equal(shouldOfferQuickCreate(OPTIONS, 'Nadia', false), false);
  });

  test('never offers creation on a blank query', () => {
    assert.equal(shouldOfferQuickCreate(OPTIONS, '   ', true), false);
  });

  test('does not offer creation when the keyword is an existing code', () => {
    assert.equal(shouldOfferQuickCreate(OPTIONS, 'cus-1', true), false);
  });

  test('offers creation for an exact label match (only codes block it)', () => {
    assert.equal(shouldOfferQuickCreate(OPTIONS, 'Amine', true), true);
  });
});

describe('quick-create option values', () => {
  test('round-trips a keyword through the option value', () => {
    const value = quickCreateOptionValue('Nadia ');
    assert.equal(isQuickCreateValue(value), true);
    assert.equal(keywordFromQuickCreateValue(value), 'Nadia ');
  });

  test('keeps real option values out of the quick-create namespace', () => {
    assert.equal(isQuickCreateValue('CUS-1'), false);
  });
});

describe('splitKeywordIntoPersonName', () => {
  test('splits the first token as the first name and the rest as the last', () => {
    assert.deepEqual(splitKeywordIntoPersonName('Amine Benali'), {
      firstName: 'Amine',
      lastName: 'Benali',
    });
  });

  test('leaves an empty last name for a single token', () => {
    assert.deepEqual(splitKeywordIntoPersonName('Sofia'), {
      firstName: 'Sofia',
      lastName: '',
    });
  });

  test('collapses internal whitespace', () => {
    assert.deepEqual(splitKeywordIntoPersonName('  Amine   Benali  '), {
      firstName: 'Amine',
      lastName: 'Benali',
    });
  });

  test('returns empty fields for a blank keyword', () => {
    assert.deepEqual(splitKeywordIntoPersonName('   '), {
      firstName: '',
      lastName: '',
    });
  });
});
