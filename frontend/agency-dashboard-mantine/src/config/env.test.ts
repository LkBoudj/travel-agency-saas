import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseEnv } from './env.ts';

test('parseEnv: builds a typed env from a valid record', () => {
  const env = parseEnv({
    VITE_API_BASE_URL: 'http://localhost:3000',
    VITE_THEMES_BASE_URL: 'http://localhost:4321',
    VITE_DEV_PORT: '5175',
    VITE_PLATFORM_DOMAIN: 'example.com',
  });

  assert.deepEqual(env, {
    apiBaseUrl: 'http://localhost:3000',
    themesBaseUrl: 'http://localhost:4321',
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

test('parseEnv: defaults themesBaseUrl to the theme-agency dev origin', () => {
  const env = parseEnv({ VITE_API_BASE_URL: 'https://api.example.com' });

  assert.equal(env.themesBaseUrl, 'http://localhost:4321');
});

test('parseEnv: normalizes a trailing slash in a root-relative themes base', () => {
  const env = parseEnv({
    VITE_API_BASE_URL: 'https://api.example.com',
    VITE_THEMES_BASE_URL: '/themes//',
  });

  assert.equal(env.themesBaseUrl, '/themes');
});

test('parseEnv: rejects a themes origin with a trailing slash (like the api base)', () => {
  assert.throws(
    () =>
      parseEnv({
        VITE_API_BASE_URL: 'https://api.example.com',
        VITE_THEMES_BASE_URL: 'https://themes.example.com/',
      }),
    /VITE_THEMES_BASE_URL/
  );
});

test('parseEnv: accepts a root-relative themes base (dev proxy path)', () => {
  const env = parseEnv({
    VITE_API_BASE_URL: 'https://api.example.com',
    VITE_THEMES_BASE_URL: '/themes/',
  });

  assert.equal(env.themesBaseUrl, '/themes');
});

test('parseEnv: throws when the themes base is a full path on an origin', () => {
  assert.throws(
    () =>
      parseEnv({
        VITE_API_BASE_URL: 'http://localhost:3000',
        VITE_THEMES_BASE_URL: 'http://localhost:4321/themes.json',
      }),
    /VITE_THEMES_BASE_URL/
  );
});

test('parseEnv: throws when the themes base is not an http(s) origin', () => {
  assert.throws(
    () =>
      parseEnv({
        VITE_API_BASE_URL: 'http://localhost:3000',
        VITE_THEMES_BASE_URL: 'ftp://themes.example.com',
      }),
    /VITE_THEMES_BASE_URL/
  );
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

test('parseEnv: reads the optional storefront origin and dev tenant', () => {
  const env = parseEnv({
    VITE_API_BASE_URL: 'http://localhost:3000',
    VITE_STOREFRONT_BASE_URL: 'http://localhost:4321',
    VITE_STOREFRONT_TENANT_SLUG: ' agy-0c937b377b89 ',
  });
  assert.equal(env.storefrontBaseUrl, 'http://localhost:4321');
  assert.equal(env.storefrontTenantSlug, 'agy-0c937b377b89');
});

test('parseEnv: omits the storefront keys when absent or blank', () => {
  const env = parseEnv({
    VITE_API_BASE_URL: 'http://localhost:3000',
    VITE_STOREFRONT_BASE_URL: '   ',
    VITE_STOREFRONT_TENANT_SLUG: '',
  });
  assert.equal(env.storefrontBaseUrl, undefined);
  assert.equal(env.storefrontTenantSlug, undefined);
});

test('parseEnv: throws on a storefront origin with a path', () => {
  assert.throws(
    () =>
      parseEnv({
        VITE_API_BASE_URL: 'http://localhost:3000',
        VITE_STOREFRONT_BASE_URL: 'http://localhost:4321/',
      }),
    /VITE_STOREFRONT_BASE_URL/
  );
  assert.throws(
    () =>
      parseEnv({
        VITE_API_BASE_URL: 'http://localhost:3000',
        VITE_STOREFRONT_BASE_URL: 'localhost:4321',
      }),
    /VITE_STOREFRONT_BASE_URL/
  );
});
