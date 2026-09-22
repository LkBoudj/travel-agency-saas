import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { z } from 'zod';
import { createFieldErrorResolver, getFieldErrors } from './form-errors.ts';

describe('getFieldErrors', () => {
  test('keeps only the first issue per field', () => {
    const schema = z.object({ email: z.string().min(1).email() });
    const result = schema.safeParse({ email: 'nope' });

    if (result.success) {
      assert.fail('expected invalid values');
    }

    const errors = getFieldErrors<'email'>(result.error, (field, issue) =>
      field === 'email' ? `msg-${issue.code}` : undefined
    );
    assert.deepEqual(errors, { email: 'msg-invalid_format' });
  });

  test('collects distinct fields together', () => {
    const schema = z.object({ a: z.number(), b: z.string().min(1) });
    const result = schema.safeParse({ a: 'x', b: '' });

    if (result.success) {
      assert.fail('expected invalid values');
    }

    const errors = getFieldErrors<'a' | 'b'>(result.error, (field, issue) =>
      issue.code === 'too_small'
        ? `${field}-required`
        : field === 'a'
          ? 'a-invalid'
          : `${field}-${issue.code}`
    );
    assert.deepEqual(errors, { a: 'a-invalid', b: 'b-required' });
  });

  test('skips fields the resolver declines', () => {
    const schema = z.object({ name: z.string().min(1) });
    const result = schema.safeParse({ name: '' });

    if (result.success) {
      assert.fail('expected invalid values');
    }

    const errors = getFieldErrors<'name'>(result.error, () => '');
    assert.deepEqual(errors, {});
  });
});

describe('createFieldErrorResolver', () => {
  const resolver = createFieldErrorResolver({
    email: { required: 'common.required', invalid: 'common.invalid' },
    roleKeys: { invalid: 'common.tooMany' },
  });

  test('maps too_small to the required key', () => {
    const result = z.object({ email: z.string().min(1) }).safeParse({ email: '' });
    if (result.success) {
      assert.fail('expected invalid values');
    }
    const toMessage = resolver((key) => `t:${key}`);
    assert.equal(toMessage('email', result.error.issues[0]), 't:common.required');
  });

  test('maps any other issue to the invalid key', () => {
    const result = z.object({ email: z.string().email() }).safeParse({ email: 'x' });
    if (result.success) {
      assert.fail('expected invalid values');
    }
    const toMessage = resolver((key) => `t:${key}`);
    assert.equal(toMessage('email', result.error.issues[0]), 't:common.invalid');
  });

  test('returns undefined when no field keys are configured', () => {
    const partial = createFieldErrorResolver<'email' | 'roleKeys'>({ email: { invalid: 'x' } });
    const toMessage = partial((key) => `t:${key}`);
    const issue = z.custom((value) => value === 'z').safeParse('y').error?.issues[0];
    assert.ok(issue);
    assert.equal(toMessage('roleKeys', issue), undefined);
  });
});
