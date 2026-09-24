import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { departurePricesSchema } from './departure-prices.schema.ts';

describe('departurePricesSchema', () => {
  it('accepts blank amounts (clearing a price)', () => {
    assert.equal(
      departurePricesSchema.safeParse({ prices: [{ pricingOptionCode: 'PRC-ADULT', amount: '' }] })
        .success,
      true
    );
  });

  it('accepts positive amounts with at most two decimals', () => {
    const result = departurePricesSchema.safeParse({
      prices: [
        { pricingOptionCode: 'PRC-ADULT', amount: '25000' },
        { pricingOptionCode: 'PRC-CHILD', amount: '12000.50' },
      ],
    });
    assert.equal(result.success, true);
  });

  it('rejects zero or negative amounts on the top-level prices field', () => {
    for (const amount of ['0', '-5', '12.123']) {
      const result = departurePricesSchema.safeParse({
        prices: [{ pricingOptionCode: 'PRC-ADULT', amount }],
      });
      assert.equal(result.success, false, `expected rejection for "${amount}"`);
      if (!result.success) {
        assert.equal(result.error.issues[0]?.path[0], 'prices');
      }
    }
  });

  it('rejects amounts that are not numbers', () => {
    const result = departurePricesSchema.safeParse({
      prices: [{ pricingOptionCode: 'PRC-ADULT', amount: 'free' }],
    });
    assert.equal(result.success, false);
  });
});
