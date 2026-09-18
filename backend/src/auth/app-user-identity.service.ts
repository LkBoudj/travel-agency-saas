import { ConflictException, Injectable } from '@nestjs/common';
import { hash } from 'argon2';
import { Prisma } from '../generated/prisma/client.js';
import { generateAppUserCode } from './app-user-code.js';

export interface AppUserIdentityInput {
  email: string;
  password: string;
  firstName?: string | null;
  lastName?: string | null;
}

/**
 * An identity whose code is generated and whose password is already hashed,
 * ready to be inserted. Hashing happens BEFORE the transaction opens so argon2
 * never holds a database transaction open.
 */
export interface PreparedAppUserIdentity {
  code: string;
  email: string;
  passwordHash: string;
  firstName: string | null;
  lastName: string | null;
}

/**
 * Generic AppUser identity creation, shared by every feature that brings a new
 * account into existence: self-registration, platform user administration and
 * agency creation with a brand new owner.
 *
 * It owns exactly three things — code generation, password hashing and the
 * unique-email conflict contract — and nothing else. It deliberately knows
 * nothing about roles, memberships or platform access: an AppUser created here
 * has no PlatformRoleAssignment and no AgencyMembership until the calling
 * feature decides what context it belongs to.
 */
@Injectable()
export class AppUserIdentityService {
  /** Generates the code and hashes the password. Safe to call outside a transaction. */
  async prepare(input: AppUserIdentityInput): Promise<PreparedAppUserIdentity> {
    return {
      code: generateAppUserCode(),
      email: input.email,
      passwordHash: await hash(input.password),
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
    };
  }

  /**
   * Inserts a prepared identity using the caller's transaction, so the account
   * only survives if the caller's whole operation commits.
   */
  async create(
    tx: Prisma.TransactionClient,
    identity: PreparedAppUserIdentity,
  ): Promise<{ id: bigint; code: string }> {
    return tx.appUser.create({
      data: {
        code: identity.code,
        email: identity.email,
        passwordHash: identity.passwordHash,
        firstName: identity.firstName,
        lastName: identity.lastName,
      },
      select: { id: true, code: true },
    });
  }

  /** True when this address already belongs to an account. */
  async emailExists(
    tx: Prisma.TransactionClient,
    email: string,
  ): Promise<boolean> {
    const existing = await tx.appUser.findUnique({
      where: { email },
      select: { id: true },
    });
    return existing !== null;
  }

  /**
   * Translates a unique-constraint violation into the project's identity error
   * contract. `email` is the only business-unique field a client can submit, so
   * a P2002 without usable `meta.target` (which Neon's driver sometimes omits)
   * is confirmed by re-reading the submitted address rather than guessed.
   *
   * Any error that is not an identity conflict is rethrown untouched.
   */
  async rethrowAsIdentityConflict(
    error: unknown,
    submittedEmail: string,
    emailExists: (email: string) => Promise<boolean>,
  ): Promise<never> {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const rawTarget = error.meta?.target;
      const target = Array.isArray(rawTarget)
        ? (rawTarget as unknown[]).join(',')
        : typeof rawTarget === 'string'
          ? rawTarget
          : '';

      if (target.includes('email') || (await emailExists(submittedEmail))) {
        throw emailAlreadyRegistered();
      }

      throw new ConflictException({
        statusCode: 409,
        message: 'Could not create user',
        errorCode: 'USER_CREATE_CONFLICT',
      });
    }
    throw error;
  }
}

/** The single definition of the duplicate-account conflict. */
export function emailAlreadyRegistered(): ConflictException {
  return new ConflictException({
    statusCode: 409,
    message: 'An account with this email address already exists',
    errorCode: 'EMAIL_ALREADY_REGISTERED',
  });
}
