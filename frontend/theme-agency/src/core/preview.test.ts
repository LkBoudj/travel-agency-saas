import assert from "node:assert/strict";
import { test } from "node:test";

import {
  decidePreviewRequest,
  isLabPath,
  MissingPreviewSecretError,
  parseLabDirParam,
  parseLabPath,
  parseLabSettingsParam,
  signPreviewToken,
  verifyPreviewToken,
} from "../platform/preview.ts";

const SECRET = "test-preview-secret";
const NOW = 1_700_000_000_000;

test("signPreviewToken round-trips claims and verifyPreviewToken accepts them", async () => {
  const token = await signPreviewToken(
    { tenantSlug: "demo", themeId: "starter" },
    { secret: SECRET, now: NOW },
  );

  const result = await verifyPreviewToken(token, { secret: SECRET, now: NOW });

  assert.equal(result.ok, true);
  assert.ok(result.ok);
  assert.equal(result.claims.tenantSlug, "demo");
  assert.equal(result.claims.themeId, "starter");
  assert.equal(result.claims.iat, Math.floor(NOW / 1000));
  assert.ok(result.claims.exp > result.claims.iat);
});

test("signPreviewToken refuses to mint a token without a server secret", async () => {
  await assert.rejects(
    signPreviewToken({ tenantSlug: "demo", themeId: "starter" }, { secret: undefined }),
    MissingPreviewSecretError,
  );
});

test("verifyPreviewToken fails closed when the server secret is absent", async () => {
  const token = await signPreviewToken(
    { tenantSlug: "demo", themeId: "starter" },
    { secret: SECRET, now: NOW },
  );

  for (const secret of [undefined, null, ""]) {
    assert.deepEqual(await verifyPreviewToken(token, { secret, now: NOW }), {
      ok: false,
      reason: "missing-secret",
    });
  }
});

test("verifyPreviewToken rejects a token signed with another secret", async () => {
  const token = await signPreviewToken(
    { tenantSlug: "demo", themeId: "starter" },
    { secret: SECRET, now: NOW },
  );

  assert.deepEqual(
    await verifyPreviewToken(token, { secret: "different-secret", now: NOW }),
    { ok: false, reason: "bad-signature" },
  );
});

test("verifyPreviewToken rejects a tampered payload or signature", async () => {
  const token = await signPreviewToken(
    { tenantSlug: "demo", themeId: "starter" },
    { secret: SECRET, now: NOW },
  );
  const [payload, signature] = token.split(".") as [string, string];

  const forgedPayload = Buffer.from(
    JSON.stringify({ tenantSlug: "demo", themeId: "other", iat: 1, exp: 9_999_999_999 }),
  )
    .toString("base64url")
    .concat(`.${signature}`);

  // Mutate a leading base64 character: the trailing characters of a signature
  // carry padding bits, so changing the last one can decode to the same bytes.
  const flippedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;

  for (const bad of [`${payload}.${flippedSignature}`, forgedPayload]) {
    assert.deepEqual(await verifyPreviewToken(bad, { secret: SECRET, now: NOW }), {
      ok: false,
      reason: "bad-signature",
    });
  }
});

test("verifyPreviewToken rejects an expired token", async () => {
  const token = await signPreviewToken(
    { tenantSlug: "demo", themeId: "starter" },
    { secret: SECRET, ttlSeconds: 60, now: NOW },
  );

  const result = await verifyPreviewToken(token, {
    secret: SECRET,
    now: NOW + 61_000,
  });

  assert.deepEqual(result, { ok: false, reason: "expired" });
});

test("verifyPreviewToken rejects malformed tokens", async () => {
  for (const token of [null, undefined, "", "not-a-token", "a.b.c", "!!!.###", "a.b.c.d"]) {
    assert.deepEqual(await verifyPreviewToken(token, { secret: SECRET, now: NOW }), {
      ok: false,
      reason: "malformed",
    });
  }
});

test("verifyPreviewToken rejects a well-formed but wrongly signed token", async () => {
  assert.deepEqual(await verifyPreviewToken("only.two", { secret: SECRET, now: NOW }), {
    ok: false,
    reason: "bad-signature",
  });
});

test("isLabPath recognizes both public and internal lab prefixes", () => {
  for (const path of [
    "/_lab/starter/home",
    "/lab/starter/home",
    "/_lab/starter/trip-detail/santorini-escape",
  ]) {
    assert.equal(isLabPath(path), true, path);
  }
  for (const path of ["/", "/lab", "/_lab", "/labs/starter/home", "/trips"]) {
    assert.equal(isLabPath(path), false, path);
  }
});

test("parseLabPath decodes the theme id and page request", () => {
  assert.deepEqual(parseLabPath("/_lab/starter/home"), {
    themeId: "starter",
    page: { kind: "home" },
  });
  assert.deepEqual(parseLabPath("/lab/starter/trips"), {
    themeId: "starter",
    page: { kind: "trips" },
  });
  assert.deepEqual(parseLabPath("/_lab/starter/trip-detail/santorini%20escape"), {
    themeId: "starter",
    page: { kind: "trip-detail", slug: "santorini escape" },
  });
});

test("parseLabPath rejects unknown pages and invalid ids", () => {
  for (const path of [
    "/_lab/starter",
    "/_lab/starter/",
    "/_lab/starter/unknown",
    "/_lab/starter/trip-detail",
    "/_lab/starter/trip-detail/",
    "/_lab/Bad--Id/home",
    "/lab/starter/trip-detail/a/b",
    "/trips",
  ]) {
    assert.equal(parseLabPath(path), null, path);
  }
});

test("parseLabSettingsParam keeps only primitive overrides", () => {
  assert.deepEqual(
    parseLabSettingsParam(
      JSON.stringify({
        "homepage.showWhyUs": false,
        "hero.title": "Riyadh",
        "homepage.count": 3,
        nested: { a: 1 },
        list: [1, 2],
        nothing: null,
      }),
    ),
    { "homepage.showWhyUs": false, "hero.title": "Riyadh", "homepage.count": 3 },
  );

  for (const value of [null, undefined, "", "{", "[]", '"text"', "42"]) {
    assert.deepEqual(parseLabSettingsParam(value), {}, String(value));
  }
});

test("parseLabDirParam accepts only ltr and rtl", () => {
  assert.equal(parseLabDirParam("rtl"), "rtl");
  assert.equal(parseLabDirParam("ltr"), "ltr");
  for (const value of [null, undefined, "", "auto", "RTL"]) {
    assert.equal(parseLabDirParam(value), undefined, String(value));
  }
});

function labParams(entries: Record<string, string>): URLSearchParams {
  return new URLSearchParams(entries);
}

test("decidePreviewRequest passes non-lab paths through to tenant resolution", async () => {
  assert.deepEqual(
    await decidePreviewRequest({
      pathname: "/trips",
      searchParams: labParams({}),
      secret: SECRET,
      now: NOW,
    }),
    { type: "public" },
  );
});

test("decidePreviewRequest fails closed without a secret or a valid token", async () => {
  const cases = [
    { pathname: "/_lab/starter/home", searchParams: labParams({}), secret: undefined },
    { pathname: "/_lab/starter/home", searchParams: labParams({}), secret: SECRET },
    {
      pathname: "/_lab/starter/home",
      searchParams: labParams({ t: "garbage" }),
      secret: SECRET,
    },
  ];

  for (const input of cases) {
    assert.deepEqual(
      await decidePreviewRequest({ ...input, now: NOW }),
      { type: "not-found" },
    );
  }
});

test("decidePreviewRequest rejects a token minted for another theme", async () => {
  const token = await signPreviewToken(
    { tenantSlug: "demo", themeId: "starter" },
    { secret: SECRET, now: NOW },
  );

  assert.deepEqual(
    await decidePreviewRequest({
      pathname: "/_lab/alternate/home",
      searchParams: labParams({ t: token }),
      secret: SECRET,
      now: NOW,
    }),
    { type: "not-found" },
  );
});

test("decidePreviewRequest rewrites a public lab URL to the internal route", async () => {
  const token = await signPreviewToken(
    { tenantSlug: "demo", themeId: "starter" },
    { secret: SECRET, now: NOW },
  );

  const decision = await decidePreviewRequest({
    pathname: "/_lab/starter/trip-detail/santorini-escape",
    searchParams: labParams({ t: token, s: '{"homepage.showWhyUs":false}', d: "rtl" }),
    secret: SECRET,
    now: NOW,
  });

  assert.equal(decision.type, "render-preview");
  assert.ok(decision.type === "render-preview");
  assert.equal(decision.rewriteTo, "/lab/starter/trip-detail/santorini-escape");
  assert.deepEqual(decision.locals, {
    tenantSlug: "demo",
    themeId: "starter",
    page: { kind: "trip-detail", slug: "santorini-escape" },
    settings: { "homepage.showWhyUs": false },
    dir: "rtl",
    token,
  });
});

test("decidePreviewRequest renders internal lab URLs without rewriting again", async () => {
  const token = await signPreviewToken(
    { tenantSlug: "demo", themeId: "starter" },
    { secret: SECRET, now: NOW },
  );

  const decision = await decidePreviewRequest({
    pathname: "/lab/starter/home",
    searchParams: labParams({ t: token }),
    secret: SECRET,
    now: NOW,
  });

  assert.equal(decision.type, "render-preview");
  assert.ok(decision.type === "render-preview");
  assert.equal(decision.rewriteTo, undefined);
});
