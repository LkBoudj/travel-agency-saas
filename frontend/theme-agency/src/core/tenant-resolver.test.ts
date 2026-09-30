import assert from "node:assert/strict";
import { test } from "node:test";

import { resolveTenantFromHostname } from "../platform/tenant-resolver.ts";

test("resolveTenantFromHostname extracts a valid platform tenant slug", () => {
  assert.deepEqual(resolveTenantFromHostname("Agency.platform.com:4321"), {
    ok: true,
    tenantSlug: "agency",
    source: "platform",
  });
  assert.deepEqual(resolveTenantFromHostname("agency.PLATFORM.COM."), {
    ok: true,
    tenantSlug: "agency",
    source: "platform",
  });
});

test("resolveTenantFromHostname rejects malformed platform tenant hosts", () => {
  for (const host of [
    "platform.com",
    "bad-.platform.com",
    "-agency.platform.com",
    "agency--.platform.com",
    "agency.platform.com.evil.test",
  ]) {
    assert.deepEqual(
      resolveTenantFromHostname(host),
      { ok: false, reason: "unrecognized-host" },
      host,
    );
  }
});

test("resolveTenantFromHostname resolves only explicitly allow-listed custom domains", () => {
  const options = {
    customDomains: {
      "Travels.Example.com.": "agency",
    },
  };

  assert.deepEqual(
    resolveTenantFromHostname("travels.example.com:443", options),
    { ok: true, tenantSlug: "agency", source: "custom" },
  );
  assert.deepEqual(
    resolveTenantFromHostname("unapproved.example.com", options),
    { ok: false, reason: "unrecognized-host" },
  );
});

test("resolveTenantFromHostname ignores custom mappings with invalid tenant slugs", () => {
  assert.deepEqual(
    resolveTenantFromHostname("travels.example.com", {
      customDomains: { "travels.example.com": "bad--tenant" },
    }),
    { ok: false, reason: "unrecognized-host" },
  );
});

test("resolveTenantFromHostname maps local hosts only when development is enabled", () => {
  for (const host of ["localhost:4321", "127.0.0.1", "[::1]"]) {
    assert.deepEqual(
      resolveTenantFromHostname(host),
      { ok: false, reason: "unrecognized-host" },
      host,
    );
    assert.deepEqual(
      resolveTenantFromHostname(host, {
        allowLocalhost: true,
        localhostTenantSlug: "demo",
      }),
      { ok: true, tenantSlug: "demo", source: "development" },
      host,
    );
  }
});

test("resolveTenantFromHostname rejects malformed host input", () => {
  for (const host of ["", "https://agency.platform.com", "user@agency.platform.com"]) {
    assert.deepEqual(
      resolveTenantFromHostname(host),
      { ok: false, reason: "unrecognized-host" },
      host,
    );
  }
});
