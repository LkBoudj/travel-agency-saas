/** An agency the signed-in user belongs to, from `GET /v1/me/agencies`. */
export type MyAgency = {
  code: string
  name: string
  /** The agency itself. A SUSPENDED agency cannot be entered. */
  status: string
  /** OWNER | EMPLOYEE. Informational only — never an authorization input. */
  membershipType: string
  /** This membership. A SUSPENDED membership cannot be entered. */
  membershipStatus: string
}

/** The caller's context inside one agency, from `GET /v1/agencies/:code/me`. */
export type AgencyContext = {
  agency: { code: string; name: string; status: string }
  membership: { membershipType: string; status: string }
  roles: Array<{ key: string; name: string }>
  /** Effective AGENCY permission keys. For UX only — the backend enforces. */
  permissions: string[]
}
