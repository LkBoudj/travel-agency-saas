export type AgencyStatus = 'ACTIVE' | 'SUSPENDED';
export type MembershipType = 'OWNER' | 'EMPLOYEE';
export type MembershipStatus = 'ACTIVE' | 'SUSPENDED';

export interface MyAgency {
  code: string;
  name: string;
  status: AgencyStatus;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
}

export interface AgencyAccess {
  agency: { code: string; name: string; status: AgencyStatus };
  membership: { membershipType: MembershipType; status: MembershipStatus };
  roles: Array<{ key: string; name: string }>;
  permissions: string[];
}
