export type AgencyMembershipType = 'OWNER' | 'EMPLOYEE';
export type AgencyMembershipStatus = 'ACTIVE' | 'SUSPENDED';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export type MemberInvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export interface AgencyRoleRef {
  key: string;
  name: string;
}

export interface AgencyMember {
  code: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  accountStatus: AccountStatus;
  membershipType: AgencyMembershipType;
  membershipStatus: AgencyMembershipStatus;
  roles: AgencyRoleRef[];
  joinedAt: string;
}

export interface AssignableAgencyRole {
  key: string;
  name: string;
  description: string | null;
}

export interface MemberInvitation {
  code: string;
  email: string;
  status: MemberInvitationStatus;
  roles: AgencyRoleRef[];
  expiresAt: string;
  createdAt: string;
}
