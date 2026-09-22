import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_LOCALE,
  getIntlLocale,
  getLocaleDirection,
  isAppLocale,
  resolveInitialLocale,
  resolveNextLocale,
} from './locales.ts';

describe('isAppLocale', () => {
  it('accepts supported locales', () => {
    assert.equal(isAppLocale('en'), true);
    assert.equal(isAppLocale('ar'), true);
  });

  it('rejects unknown values', () => {
    assert.equal(isAppLocale('fr'), false);
    assert.equal(isAppLocale(''), false);
    assert.equal(isAppLocale(undefined), false);
    assert.equal(isAppLocale(null), false);
  });
});

describe('resolveNextLocale', () => {
  it('toggles between en and ar', () => {
    assert.equal(resolveNextLocale('en'), 'ar');
    assert.equal(resolveNextLocale('ar'), 'en');
  });
});

describe('getLocaleDirection', () => {
  it('maps ar to rtl and en to ltr', () => {
    assert.equal(getLocaleDirection('ar'), 'rtl');
    assert.equal(getLocaleDirection('en'), 'ltr');
  });
});

describe('getIntlLocale', () => {
  it('returns the Intl tag per locale', () => {
    assert.equal(getIntlLocale('en'), 'en-US');
    assert.equal(getIntlLocale('ar'), 'ar-DZ');
  });
});

describe('resolveInitialLocale', () => {
  it('prefers the stored locale', () => {
    assert.equal(resolveInitialLocale('ar', 'en-US'), 'ar');
    assert.equal(resolveInitialLocale('en', 'ar-DZ'), 'en');
  });

  it('falls back to an Arabic browser language', () => {
    assert.equal(resolveInitialLocale(undefined, 'ar-DZ'), 'ar');
    assert.equal(resolveInitialLocale(null, 'ar'), 'ar');
  });

  it('defaults to en otherwise', () => {
    assert.equal(resolveInitialLocale(undefined, 'en-US'), DEFAULT_LOCALE);
    assert.equal(resolveInitialLocale(undefined, undefined), DEFAULT_LOCALE);
  });
});
