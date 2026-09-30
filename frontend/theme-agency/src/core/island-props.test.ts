import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ISLAND_IDS,
  ISLAND_REQUIRED_PROPS,
  findUnserializableValue,
  isIslandId,
  validateIslandProps,
} from "./island-props.ts";

describe("island id contract", () => {
  it("exposes the shared islands", () => {
    assert.deepEqual([...ISLAND_IDS], ["search-filter", "date-picker", "booking-cta"]);
  });

  it("recognises only registered ids", () => {
    assert.equal(isIslandId("search-filter"), true);
    assert.equal(isIslandId("booking-cta"), true);
    assert.equal(isIslandId("Search-Filter"), false);
    assert.equal(isIslandId("gallery"), false);
    assert.equal(isIslandId(undefined), false);
  });

  it("declares required props for every island", () => {
    assert.deepEqual(Object.keys(ISLAND_REQUIRED_PROPS).sort(), [...ISLAND_IDS].sort());
  });
});

describe("findUnserializableValue", () => {
  it("accepts JSON-safe data", () => {
    assert.equal(findUnserializableValue({ a: [1, "two", true, null], b: { c: 3 } }), null);
  });

  it("reports the path of a function prop", () => {
    assert.equal(findUnserializableValue({ onPick: () => {} }), "onPick");
  });

  it("reports the path of a nested callback", () => {
    assert.equal(findUnserializableValue({ items: [{ id: "a", run: () => {} }] }), "items[0].run");
  });

  it("rejects non-plain objects", () => {
    assert.equal(findUnserializableValue({ at: new Date(0) }), "at");
    assert.equal(findUnserializableValue({ set: new Set([1]) }), "set");
  });

  it("rejects non-finite numbers", () => {
    assert.equal(findUnserializableValue({ ratio: Number.NaN }), "ratio");
    assert.equal(findUnserializableValue({ ratio: Number.POSITIVE_INFINITY }), "ratio");
  });

  it("rejects array holes but allows absent object values", () => {
    assert.equal(findUnserializableValue({ items: [1, undefined, 3] }), "items[1]");
    assert.equal(findUnserializableValue({ maybe: undefined }), null);
  });

  it("rejects symbols and bigints", () => {
    assert.equal(findUnserializableValue({ tag: Symbol("x") }), "tag");
    assert.equal(findUnserializableValue({ big: 10n }), "big");
  });
});

describe("validateIslandProps", () => {
  it("accepts valid search-filter props", () => {
    const result = validateIslandProps("search-filter", {
      label: "Search tours",
      items: [{ id: "santorini-escape", label: "Santorini", meta: "8 days" }],
      maxResults: 5,
    });
    assert.deepEqual(result, { ok: true });
  });

  it("accepts valid date-picker and booking-cta props", () => {
    assert.deepEqual(validateIslandProps("date-picker", { label: "When?", min: "2026-01-01" }), {
      ok: true,
    });
    assert.deepEqual(
      validateIslandProps("booking-cta", {
        title: "Ready to book?",
        ctaLabel: "Check availability",
        successMessage: "We will confirm shortly.",
      }),
      { ok: true },
    );
  });

  it("rejects an unknown island id", () => {
    const result = validateIslandProps("gallery", { label: "x" });
    assert.equal(result.ok, false);
    assert.match(result.issues[0] ?? "", /unknown island id/);
  });

  it("rejects non-object props", () => {
    const result = validateIslandProps("booking-cta", ["not", "an", "object"]);
    assert.equal(result.ok, false);
    assert.match(result.issues[0] ?? "", /plain object/);
  });

  it("reports every missing required prop", () => {
    const result = validateIslandProps("booking-cta", { note: "hello" });
    assert.equal(result.ok, false);
    assert.equal(result.issues.length, 3);
    assert.ok(result.issues.some((issue) => issue.includes('"title"')));
    assert.ok(result.issues.some((issue) => issue.includes('"ctaLabel"')));
    assert.ok(result.issues.some((issue) => issue.includes('"successMessage"')));
  });

  it("reports a non-serializable prop with its path", () => {
    const result = validateIslandProps("date-picker", { label: "When?", min: new Date(0) });
    assert.equal(result.ok, false);
    assert.match(result.issues[0] ?? "", /"min" is not serializable/);
  });
});
