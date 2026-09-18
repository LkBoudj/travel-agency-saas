/**
 * The agency a request is operating on, as resolved from the route.
 *
 * Only safe, externally meaningful data: the caller sees the agency by its
 * `code`, never by a database id.
 */
export interface AgencyContextAgency {
  /** Internal id, used only server-side to scope queries. Never serialized. */
  id: bigint;
  code: string;
  name: string;
  status: string;
}

export interface AgencyContextMembership {
  /** Internal id, used only server-side. Never serialized. */
  id: bigint;
  membershipType: string;
  status: string;
}

/** An AGENCY role that contributed to the effective permission set. */
export interface AgencyContextRole {
  key: string;
  name: string;
}

/**
 * Everything an agency-scoped request needs, resolved once per request.
 *
 * `permissionKeys` is the effective, deduplicated union of AGENCY permissions
 * reachable from this membership's valid AGENCY roles. It is the ONLY basis for
 * an authorization decision: `membershipType`, role keys/names and `systemKey`
 * are deliberately not part of any decision, and an OWNER is evaluated exactly
 * like an EMPLOYEE.
 */
export interface AgencyAccessContext {
  agency: AgencyContextAgency;
  membership: AgencyContextMembership;
  roles: AgencyContextRole[];
  permissionKeys: string[];
}

/**
 * The request property the guard populates. Downstream handlers read the
 * already-resolved context instead of resolving it again.
 */
export const AGENCY_ACCESS_REQUEST_KEY = 'agencyAccess' as const;

export interface RequestWithAgencyAccess {
  [AGENCY_ACCESS_REQUEST_KEY]?: AgencyAccessContext;
}
