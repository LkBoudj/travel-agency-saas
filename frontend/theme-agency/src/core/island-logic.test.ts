import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countNights,
  filterIslandItems,
  isIsoDate,
  nextIsoDate,
} from "./island-logic.ts";

const items = [
  { id: "santorini-escape", label: "Santorini Escape", meta: "8 days", keywords: ["greece"] },
  { id: "istanbul-discovery", label: "Istanbul Discovery", meta: "6 days" },
  { id: "dubai-adventure", label: "Dubai Adventure", meta: "5 days", keywords: ["desert"] },
];

describe("filterIslandItems", () => {
  it("returns every item for an empty query", () => {
    assert.deepEqual(filterIslandItems(items, "   "), items);
  });

  it("matches label, meta and keywords case-insensitively", () => {
    assert.deepEqual(
      filterIslandItems(items, "SANTORINI").map((item) => item.id),
      ["santorini-escape"],
    );
    assert.deepEqual(
      filterIslandItems(items, "5 days").map((item) => item.id),
      ["dubai-adventure"],
    );
    assert.deepEqual(
      filterIslandItems(items, "greece").map((item) => item.id),
      ["santorini-escape"],
    );
  });

  it("returns nothing for an unmatched query", () => {
    assert.deepEqual(filterIslandItems(items, "reykjavik"), []);
  });

  it("caps the result count at maxResults", () => {
    assert.equal(filterIslandItems(items, "", 2).length, 2);
    assert.equal(filterIslandItems(items, "", 0).length, 0);
  });
});

describe("isIsoDate", () => {
  it("accepts a real YYYY-MM-DD date", () => {
    assert.equal(isIsoDate("2026-02-28"), true);
  });

  it("rejects malformed or impossible dates", () => {
    assert.equal(isIsoDate("2026-2-28"), false);
    assert.equal(isIsoDate("2026-13-01"), false);
    assert.equal(isIsoDate("2026-02-30"), false);
    assert.equal(isIsoDate(""), false);
  });
});

describe("countNights", () => {
  it("counts nights between two dates", () => {
    assert.equal(countNights("2026-02-01", "2026-02-05"), 4);
  });

  it("returns null when a date is missing or invalid", () => {
    assert.equal(countNights("", "2026-02-05"), null);
    assert.equal(countNights("2026-02-01", ""), null);
    assert.equal(countNights("nope", "2026-02-05"), null);
  });

  it("returns null when the end is not after the start", () => {
    assert.equal(countNights("2026-02-05", "2026-02-01"), null);
    assert.equal(countNights("2026-02-05", "2026-02-05"), null);
  });
});

describe("nextIsoDate", () => {
  it("advances one day", () => {
    assert.equal(nextIsoDate("2026-02-28"), "2026-03-01");
    assert.equal(nextIsoDate("2024-02-28"), "2024-02-29");
  });

  it("returns null for an invalid date", () => {
    assert.equal(nextIsoDate("2026-02-30"), null);
    assert.equal(nextIsoDate(""), null);
  });
});
