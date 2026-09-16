export interface AuthUser {
  code: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface InternalAuthUser extends AuthUser {
  id: string;
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
}): InternalAuthUser {
  return {
    id: input.id.toString(),
    ...toAuthUser(input),
  };
}