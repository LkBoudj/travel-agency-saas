import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseEnv } from './env.ts';

test('parseEnv: builds a typed env from a valid record', () => {
  const env = parseEnv({
    VITE_API_BASE_URL: 'http://localhost:3000',
    VITE_DEV_PORT: '5175',
    VITE_PLATFORM_DOMAIN: 'example.com',
  });

  assert.deepEqual(env, {
    apiBaseUrl: 'http://localhost:3000',
    devPort: 5175,
    platformDomain: 'example.com',
  });
});

test('parseEnv: defaults devPort and platformDomain when absent', () => {
  const env = parseEnv({ VITE_API_BASE_URL: 'https://api.example.com' });

  assert.equal(env.apiBaseUrl, 'https://api.example.com');
  assert.equal(env.devPort, 5175);
  assert.equal(env.platformDomain, undefined);
});

test('parseEnv: throws when VITE_API_BASE_URL is missing', () => {
  assert.throws(() => parseEnv({}), /VITE_API_BASE_URL/);
});

test('parseEnv: throws on a trailing slash', () => {
  assert.throws(
    () => parseEnv({ VITE_API_BASE_URL: 'http://localhost:3000/' }),
    /VITE_API_BASE_URL/
  );
});

test('parseEnv: throws when the base URL is not an http(s) origin', () => {
  assert.throws(() => parseEnv({ VITE_API_BASE_URL: 'ftp://localhost:3000' }), /VITE_API_BASE_URL/);
});

test('parseEnv: throws on a non-numeric dev port', () => {
  assert.throws(
    () => parseEnv({ VITE_API_BASE_URL: 'http://localhost:3000', VITE_DEV_PORT: 'abc' }),
    /VITE_DEV_PORT/
  );
});
