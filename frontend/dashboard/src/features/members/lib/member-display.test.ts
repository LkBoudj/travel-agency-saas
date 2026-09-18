import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  candidateBlockedReason,
  formatJoinedAt,
  hasNoRoles,
  isCandidateSelectable,
  isOwner,
  isSuspendedMember,
  memberDisplayName,
  memberInitials,
  memberRolesLabel,
  membershipStatusLabel,
  membershipTypeLabel,
} from "./member-display.ts"
import type { AgencyMember, MemberCandidate } from "../types/members.types.ts"

function member(overrides: Partial<AgencyMember> = {}): AgencyMember {
  return {
    code: "USR-0000000000A1",
    firstName: "Ahmed",
    lastName: "Bensaid",
    email: "ahmed@agency.example",
    accountStatus: "ACTIVE",
    membershipType: "EMPLOYEE",
    membershipStatus: "ACTIVE",
    roles: [{ key: "AGENCY_BOOKING_AGENT", name: "Booking Agent" }],
    joinedAt: "2026-03-04T10:00:00.000Z",
    ...overrides,
  }
}

function candidate(overrides: Partial<MemberCandidate> = {}): MemberCandidate {
  return {
    code: "USR-0000000000B2",
    firstName: "Sara",
    lastName: null,
    email: "sara@agency.example",
    status: "ACTIVE",
    alreadyMember: false,
    ...overrides,
  }
}

describe("ownership", () => {
  it("reads ownership from membershipType, never from a role", () => {
    assert.equal(isOwner(member({ membershipType: "OWNER" })), true)
    assert.equal(isOwner(member({ membershipType: "EMPLOYEE" })), false)
  })

  it("does not treat a role named Owner as ownership", () => {
    const impostor = member({
      membershipType: "EMPLOYEE",
      roles: [{ key: "AGENCY_CUSTOM_OWNER", name: "Owner" }],
    })
    assert.equal(isOwner(impostor), false)
    assert.equal(membershipTypeLabel(impostor), "Employee")
  })

  it("labels the owner as Owner", () => {
    assert.equal(membershipTypeLabel(member({ membershipType: "OWNER" })), "Owner")
  })
})

describe("memberDisplayName", () => {
  it("joins the recorded name parts", () => {
    assert.equal(memberDisplayName(member()), "Ahmed Bensaid")
  })

  it("uses whichever part exists", () => {
    assert.equal(memberDisplayName(member({ lastName: null })), "Ahmed")
    assert.equal(memberDisplayName(member({ firstName: null })), "Bensaid")
  })

  it("falls back to the email rather than rendering an empty cell", () => {
    assert.equal(
      memberDisplayName(member({ firstName: null, lastName: null })),
      "ahmed@agency.example"
    )
  })

  it("ignores whitespace-only names", () => {
    assert.equal(
      memberDisplayName(member({ firstName: "   ", lastName: "  " })),
      "ahmed@agency.example"
    )
  })
})

describe("memberInitials", () => {
  it("takes one letter per name part, capped at two", () => {
    assert.equal(memberInitials(member()), "AB")
    assert.equal(memberInitials(member({ lastName: null })), "A")
  })

  it("falls back to the email's first letter", () => {
    assert.equal(
      memberInitials(member({ firstName: null, lastName: null })),
      "A"
    )
  })
})

describe("roles presentation", () => {
  it("lists role names", () => {
    const two = member({
      roles: [
        { key: "A", name: "Booking Agent" },
        { key: "B", name: "Tour Manager" },
      ],
    })
    assert.equal(memberRolesLabel(two), "Booking Agent, Tour Manager")
  })

  it("states zero roles explicitly instead of leaving a blank", () => {
    const none = member({ roles: [] })
    assert.equal(hasNoRoles(none), true)
    assert.equal(memberRolesLabel(none), "No roles assigned")
  })

  it("does not treat zero roles as an error state", () => {
    assert.equal(hasNoRoles(member()), false)
  })
})

describe("membership status", () => {
  it("distinguishes active from suspended", () => {
    assert.equal(membershipStatusLabel(member()), "Active")
    assert.equal(
      membershipStatusLabel(member({ membershipStatus: "SUSPENDED" })),
      "Suspended"
    )
    assert.equal(isSuspendedMember(member({ membershipStatus: "SUSPENDED" })), true)
  })
})

describe("formatJoinedAt", () => {
  it("formats a real timestamp", () => {
    assert.match(formatJoinedAt("2026-03-04T10:00:00.000Z"), /2026/)
  })

  it("degrades to a dash rather than Invalid Date", () => {
    assert.equal(formatJoinedAt("not-a-date"), "—")
    assert.equal(formatJoinedAt(""), "—")
  })
})

describe("candidate selectability", () => {
  it("allows an active non-member", () => {
    assert.equal(candidateBlockedReason(candidate()), null)
    assert.equal(isCandidateSelectable(candidate()), true)
  })

  it("blocks and explains an existing member", () => {
    const blocked = candidate({ alreadyMember: true })
    assert.match(candidateBlockedReason(blocked)!, /already a member/i)
    assert.equal(isCandidateSelectable(blocked), false)
  })

  it("blocks and explains an inactive account", () => {
    const blocked = candidate({ status: "SUSPENDED" })
    assert.match(candidateBlockedReason(blocked)!, /not active/i)
    assert.equal(isCandidateSelectable(blocked), false)
  })
})
