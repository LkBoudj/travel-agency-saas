export interface AuthUser {
  code: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export type AppUserAccountStatus = 'ACTIVE' | 'SUSPENDED';

/**
 * Identity as resolved for an authenticated request. Carries the account
 * status so authentication entry points can reject SUSPENDED accounts; the
 * status is never placed inside the JWT (it is authorization state and is
 * re-read from the database on every request).
 */
export interface InternalAuthUser extends AuthUser {
  id: string;
  status: AppUserAccountStatus;
}

export interface JwtPayload {
  sub: string;
}

export function toAuthUser(input: {
  code: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}): AuthUser {
  return {
    code: input.code,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
  };
}

export function toInternalAuthUser(input: {
  id: bigint;
  code: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: AppUserAccountStatus;
}): InternalAuthUser {
  return {
    id: input.id.toString(),
    status: input.status,
    ...toAuthUser(input),
  };
}