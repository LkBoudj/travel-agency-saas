import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  buildDeparturePayload,
  buildDepartureUpdatePayload,
  emptyDepartureForm,
  toDepartureFormValues,
} from "./departure-payloads.ts"
import type {
  AgencyDeparture,
  DepartureStatus,
} from "../types/departure.types.ts"

describe("buildDeparturePayload", () => {
  it("keeps the naive input window, promotes the deadline, nulls blank notes", () => {
    assert.deepEqual(
      buildDeparturePayload({
        startAt: "2026-12-20T08:00",
        endAt: "2026-12-20T18:00",
        capacity: 12,
        bookingDeadline: "2026-12-10",
        notes: "  Meet at the parking lot.  ",
      }),
      {
        startAt: "2026-12-20T08:00",
        endAt: "2026-12-20T18:00",
        capacity: 12,
        bookingDeadline: "2026-12-10T00:00:00.000Z",
        notes: "Meet at the parking lot.",
      }
    )
  })

  it("sends a full ISO date-time already on the wire, untouched", () => {
    assert.deepEqual(
      buildDeparturePayload({
        startAt: "2026-12-20T08:00:00.000Z",
        endAt: "2026-12-20T18:00:00.000Z",
        capacity: 9,
        bookingDeadline: "",
        notes: "",
      }),
      {
        startAt: "2026-12-20T08:00:00.000Z",
        endAt: "2026-12-20T18:00:00.000Z",
        capacity: 9,
        bookingDeadline: null,
        notes: null,
      }
    )
  })
})

describe("buildDepartureUpdatePayload", () => {
  it("adds the status on top of the operational payload", () => {
    const payload = buildDepartureUpdatePayload({
      startAt: "2026-12-20T08:00",
      endAt: "2026-12-20T18:00",
      capacity: 12,
      bookingDeadline: "",
      notes: "",
      status: "CLOSED",
    })
    assert.equal(payload.status, "CLOSED")
    assert.equal(payload.bookingDeadline, null)
  })
})

describe("emptyDepartureForm", () => {
  it("returns a blank cadence with the requested default status", () => {
    assert.deepEqual(emptyDepartureForm("OPEN"), {
      startAt: "",
      endAt: "",
      capacity: 1,
      bookingDeadline: "",
      notes: "",
      status: "OPEN",
    })
  })
})

describe("toDepartureFormValues", () => {
  const departure: AgencyDeparture = {
    code: "DEP-ABC123",
    status: "CLOSED" as DepartureStatus,
    startAt: "2026-12-20T08:00:00.000Z",
    endAt: "2026-12-20T18:30:00.000Z",
    capacity: 9,
    bookingDeadline: "2026-12-10T23:59:00.000Z",
    notes: "Moved to winter.",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  }

  it("slices inputs back to what the native controls accept", () => {
    assert.deepEqual(toDepartureFormValues(departure), {
      startAt: "2026-12-20T08:00",
      endAt: "2026-12-20T18:30",
      capacity: 9,
      bookingDeadline: "2026-12-10",
      notes: "Moved to winter.",
      status: "CLOSED",
    })
  })

  it("turns a missing deadline and notes into empty form fields", () => {
    assert.deepEqual(
      toDepartureFormValues({ ...departure, bookingDeadline: null, notes: null }),
      {
        startAt: "2026-12-20T08:00",
        endAt: "2026-12-20T18:30",
        capacity: 9,
        bookingDeadline: "",
        notes: "",
        status: "CLOSED",
      }
    )
  })
})