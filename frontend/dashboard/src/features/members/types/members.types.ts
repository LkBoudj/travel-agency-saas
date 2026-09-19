/** An AGENCY role as exposed to member surfaces. No id, no `systemKey`. */
export type MemberRoleRef = {
  key: string
  name: string
}

/**
 * One member of ONE agency, from `GET /v1/agencies/:code/members`.
 *
 * `accountStatus` is the person's identity across the product; `membershipStatus`
 * is their access to this agency alone. They are separate on purpose: an ACTIVE
 * account can hold a SUSPENDED membership here and stay active elsewhere.
 */
export type AgencyMember = {
  code: string
  firstName: string | null
  lastName: string | null
  email: string
  accountStatus: string
  /** OWNER | EMPLOYEE. Ownership is a membership fact, never a role. */
  membershipType: string
  membershipStatus: string
  roles: MemberRoleRef[]
  joinedAt: string
}

/** An assignable role, from `GET .../available-roles`. */
export type AssignableRole = {
  key: string
  name: string
  description: string | null
}

/** Membership status this UI can set. */
export type MembershipStatus = "ACTIVE" | "SUSPENDED"

export type ReplaceRolesPayload = { roleKeys: string[] }

export type SetMemberStatusPayload = { status: MembershipStatus }
