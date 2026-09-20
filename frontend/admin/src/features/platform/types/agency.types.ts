/**
 * Agency lifecycle status. Owned by the backend (database CHECK constraint
 * `agency_status_check`). It is the BUSINESS switch: suspending an agency never
 * suspends its owner, whose membership always stays ACTIVE.
 */
export type AgencyStatus = "ACTIVE" | "SUSPENDED"

/**
 * The agency owner, derived by the backend from the OWNER membership — it is
 * not stored on the agency. `code` is the stable AppUser identifier; database
 * ids are never exposed.
 *
 * `status` here is the owner's AppUser identity status, which is independent of
 * the agency's status.
 */
export type AgencyOwner = {
  code: string
  email: string
  firstName: string | null
  lastName: string | null
  status: string
}

/**
 * Agency row as returned by `GET /v1/agencies`. `membersCount` is a derived
 * aggregate over agency memberships, never a stored counter.
 *
 * There is intentionally no customer count: the platform has no customer model
 * yet, so none is displayed or invented.
 */
export type Agency = {
  code: string
  name: string
  status: AgencyStatus
  country: string | null
  description: string | null
  owner: AgencyOwner | null
  membersCount: number
  createdAt: string
  updatedAt: string
}

/**
 * `GET /v1/agencies/:code`. Adds the approved application this agency came
 * from, when it originated from an application.
 */
export type AgencyDetails = Agency & {
  applicationId: string | null
}
